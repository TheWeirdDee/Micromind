import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import multer from 'multer';
import Groq from 'groq-sdk';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { celo } from 'viem/chains';
import { MICROMIND_ABI, MICROMIND_STAKING_ABI } from './lib/contract';
import { Resend } from 'resend';
import {
  verifyRelaySignature,
  claimNonce,
  isDeadlineValid,
  executeRelay,
  verifyChallengeRelaySignature,
  executeChallengeRelay,
} from './lib/relayer';
import { decryptAESGCM } from './lib/crypto';
import { supabase } from './lib/supabase';
import { getStageCount, getTargetWord, TOTAL_LEVELS } from './lib/quest-levels';
import { resolveAdminUser, requireAdmin } from './lib/admin';
import { openStoryChallenge, finalizeStoryChallenges, listStoryChallengesWithStats } from './lib/stories-admin';
import webpush from 'web-push';
import type { Redis } from '@upstash/redis';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;
const STAKING_CONTRACT_ADDRESS = process.env.STAKING_CONTRACT_ADDRESS as `0x${string}`;

// Fail fast — without a valid contract address the agent cannot decode events
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
  console.error('[STARTUP] FATAL: CONTRACT_ADDRESS env var is missing or zero address. Exiting.');
  process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY && process.env.VAPID_SUBJECT);
if (vapidConfigured) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT as string,
    process.env.VAPID_PUBLIC_KEY as string,
    process.env.VAPID_PRIVATE_KEY as string,
  );
} else {
  console.warn('[STARTUP] VAPID keys not configured — /api/cron/send-reminder-pushes will be a no-op.');
}

const publicClient = createPublicClient({
  chain: celo,
  transport: http('https://rpc.ankr.com/celo')
});

// Shared toolId -> name/price lookup for the authoritative prompt_history record
// (never trust a client-supplied cost/name for that table).
const TOOL_INFO: Record<number, { name: string; price: string }> = {
  1: { name: 'Chat', price: '0.005' },
  2: { name: 'Tweet', price: '0.005' },
  3: { name: 'Reflect', price: '0.005' },
  4: { name: 'Pattern', price: '0.005' },
  5: { name: 'Letter', price: '0.01' },
};

/** Resolves a Supabase user id from an `Authorization: Bearer <token>` header. Never throws. */
async function resolveUserId(authHeader?: string): Promise<string | null> {
  if (!authHeader || !supabase) return null;
  const token = authHeader.split(' ')[1];
  if (!token) return null;
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user.id;
  } catch {
    return null;
  }
}

/**
 * Best-effort write to the authoritative prompt_history table.
 * Never throws — a failed history write must never break the user's AI response.
 */
async function recordPromptHistory(row: {
  user_id: string;
  tool_id: number;
  tool_name: string;
  prompt: string;
  response: string;
  cost: string;
  tx_hash: string;
}): Promise<void> {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('prompt_history')
      .upsert(row, { onConflict: 'tx_hash', ignoreDuplicates: true });
    if (error) console.warn('[HISTORY] Failed to record prompt history:', error.message);
  } catch (err) {
    console.warn('[HISTORY] Failed to record prompt history:', err);
  }
}

/**
 * Verifies a txHash is a real, successful, on-chain payment to CONTRACT_ADDRESS
 * for the given toolId, and that it hasn't already been redeemed for an AI
 * response — otherwise a fabricated or reused txHash lets anyone call a paid
 * endpoint for free. Returns null if the payment is valid and unclaimed, or a
 * user-facing error string otherwise. Any verification failure (including a
 * receipt lookup throwing, e.g. for a malformed/never-mined hash) is treated
 * as invalid — it must never fall through to a free AI call.
 */
async function verifyPaymentEvent(txHash: string, expectedToolId: number): Promise<string | null> {
  if (await getData(`resp:${txHash}`)) {
    return 'This payment has already been used.';
  }

  let receipt;
  try {
    receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
  } catch {
    return 'Payment transaction not found.';
  }
  if (!receipt || receipt.status !== 'success') {
    return 'Invalid or pending payment transaction.';
  }

  const log = receipt.logs.find(l => l.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase());
  if (!log) {
    return 'Transaction did not pay the MicroMind contract.';
  }

  let event;
  try {
    event = decodeEventLog({ abi: MICROMIND_ABI, eventName: 'PromptPaid', data: log.data, topics: log.topics });
  } catch {
    return 'Could not verify payment event.';
  }

  const { toolId } = event.args as { toolId?: number | bigint };
  if (toolId === undefined || Number(toolId) !== expectedToolId) {
    return 'Payment does not match the requested tool.';
  }

  return null;
}

let redis: {
  set: (key: string, value: string, options?: { ex: number }) => Promise<unknown>;
  get: (key: string) => Promise<string | null>;
} | null = null;

async function initStorage() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      console.log('Using Upstash Redis for storage');
    } catch (e) {
      console.error('Failed to init Redis, falling back to memory', e);
    }
  } else {
    console.log('Using in-memory storage (add Upstash for persistence)');
  }
}

const memoryStore = new Map<string, string>();

async function storeData(key: string, value: string, ttl = 3600) {
  if (redis) {
    await redis.set(key, value, { ex: ttl });
  } else {
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), ttl * 1000);
  }
}

async function getData(key: string): Promise<string | null> {
  if (redis) {
    return await redis.get(key);
  }
  return memoryStore.get(key) ?? null;
}

// Tool IDs: 1=Chat, 2=Tweet, 3=Reflect, 4=Pattern, 5=Letter (AI Polish)
const SYSTEM_PROMPTS: Record<number, string> = {
  0: "Current Date: June 2026. You are a helpful AI assistant for MicroMind, a personal journaling app. Provide direct, accurate, and thoughtful responses. Do NOT mention transactions, payments, CELO, or processing status. Just answer the question.",
  1: "Current Date: June 2026. You are a helpful AI assistant for MicroMind, a personal journaling app. Provide direct, accurate, and thoughtful responses. Do NOT mention transactions, payments, CELO, or processing status. Just answer the question.",
  2: "Current Date: June 2026. Turn this personal thought or journal reflection into a compelling tweet under 280 characters. Keep the authentic, human voice of the writer. Make it specific and emotionally resonant — not generic or corporate-sounding. Add 1-2 hashtags only if they feel completely natural. Return only the tweet text, nothing else.",
  3: "You are a compassionate journal companion. The user has shared their recent journal entries below. Write a warm, insightful weekly reflection (150-200 words) that summarizes their emotional journey, highlights any growth moments or recurring themes, and ends with one encouraging, actionable thought. Be personal and gentle. Do not be clinical or list-heavy — write as a trusted friend would.",
  4: "You are an empathetic AI analyst. Analyze these journal entries and identify exactly 3 emotional patterns or recurring themes in the user's life. For each pattern, provide:\n1. A short, memorable name (2-4 words, e.g. \"The Sunday Spiral\")\n2. A 1-2 sentence description of what you noticed\n3. One gentle, actionable insight (start with \"Try:\")\nBe warm and non-clinical. Frame patterns as observations, not diagnoses. Format your response clearly with each pattern separated.",
  5: "You are a warm and eloquent writing assistant. Rewrite this letter to make it more heartfelt, emotionally resonant, and beautifully expressed — while keeping the original meaning and the authentic voice of the writer completely intact. Do not add information, events, or relationships that were not in the original. Do not change the tone from loving to formal or vice versa — enhance what is already there. Return only the rewritten letter text, nothing else.",
};

const COACH_SYSTEM_PROMPT = `You are a compassionate, professional writing coach and cognitive behavioral therapy (CBT) guide. The user will share their draft journal entry. Your goal is to help them reflect, understand their thinking patterns, and express themselves more clearly without rewriting their words for them.
Analyze the entry for common cognitive distortions or thinking traps:
- Catastrophizing (imagining the worst-case scenario)
- All-or-nothing thinking (black-and-white reasoning)
- Mind reading (assuming what others think without evidence)
- Emotional reasoning (treating feelings as objective facts)
- Personalization (taking full blame for outside events)

Write a short, encouraging coaching response (under 150 words) structured exactly as follows:
1. Acknowledge & Validate: Validate their feelings in a warm, gentle tone (1-2 sentences).
2. Isolate Distortion: If you spot a thinking trap, gently point it out. If none are present, highlight a strength in their self-expression.
3. Reflective Question: Ask one targeted, open-ended question that prompts them to think about the situation from a different, healthier angle.

Do not write or rewrite their journal. Act strictly as a supportive guide.`;

// RESEND_FROM_EMAIL must be set to an address on a domain you've verified in the
// Resend dashboard (e.g. "MicroMind Letters <letters@yourdomain.com>").
// Using onboarding@resend.dev only works for the Resend account owner's email.
const RESEND_FROM = process.env.RESEND_FROM_EMAIL || 'MicroMind Letters <onboarding@resend.dev>';

async function sendEmail(to: string, senderName: string, content: string) {
  if (!resend) {
    console.warn('[EMAIL] Resend not configured. Skipping email send.');
    return;
  }

  const subject = `A letter for you, from ${senderName}`;
  const text = `${content}\n\n---\nSent via MicroMind · https://micromindapp.xyz/app`;

  await resend.emails.send({
    from: RESEND_FROM,
    to,
    subject,
    text
  });
  console.log(`[EMAIL] Sent email successfully to ${to}`);
}

async function callAI(toolId: number, prompt: string): Promise<string> {
  try {
    console.log(`[AI] Generating for tool ${toolId}...`);
    
    let finalPrompt = prompt;
    let recipientEmail = '';
    let senderName = '';

    // If it is the Letter tool, the prompt is a JSON string containing content, email, and name
    if (toolId === 5) {
      try {
        const parsed = JSON.parse(prompt);
        finalPrompt = parsed.content || '';
        recipientEmail = parsed.recipientEmail || '';
        senderName = parsed.senderName || '';
      } catch {
        console.log('[AI] Failed to parse JSON prompt for Letter tool, using raw prompt');
      }
    }

    let messages: { role: string; content: string }[] = [
      { role: "system", content: SYSTEM_PROMPTS[toolId] ?? SYSTEM_PROMPTS[0] }
    ];

    // Check if prompt is a JSON array of messages (chat history)
    try {
      if (finalPrompt.trim().startsWith('[') && finalPrompt.trim().endsWith(']')) {
        const history = JSON.parse(finalPrompt);
        if (Array.isArray(history)) {
          messages = [...messages, ...history];
        } else {
          messages.push({ role: "user", content: finalPrompt });
        }
      } else {
        messages.push({ role: "user", content: finalPrompt });
      }
    } catch {
      messages.push({ role: "user", content: finalPrompt });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.7,
      messages
    });
    
    const result = completion.choices[0]?.message?.content ?? "No response generated.";
    console.log(`[AI] Success! Response length: ${result.length}`);

    // If it is the Letter tool, send email in background
    if (toolId === 5 && recipientEmail) {
      console.log(`[EMAIL] Sending polished letter to ${recipientEmail}...`);
      sendEmail(recipientEmail, senderName, result).catch(err => {
        console.error('[EMAIL] Failed to send polished letter email:', err);
      });
    }

    return result;
  } catch (error) {
    const err = error as Error;
    console.error('[AI] Groq Error:', err.message);
    return `AI generation failed: ${err.message}`;
  }
}

// Limit request body to 50 KB to prevent payload-based DoS attacks
app.use(express.json({ limit: '50kb' }));

// Restrict cross-origin requests to known frontends. Defaults cover local dev
// and the production Vercel deployment; override/extend via ALLOWED_ORIGINS
// (comma-separated) for preview deployments or a custom domain.
const defaultOrigins = ['http://localhost:3000', 'https://micromind-three.vercel.app'];
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : defaultOrigins;
app.use(cors({
  origin: (origin, callback) => {
    // No Origin header (server-to-server, curl, mobile webview) — allow.
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
}));

// Every relay/withdraw route moves real funds or spends the developer
// wallet's own CELO gas — cap how often a single client IP can hit them so a
// script can't cheaply force-drain the gas wallet by spamming valid, freshly-
// signed (but off-chain-free-to-produce) requests.
const relayRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down and try again shortly.' },
});

// Stamp every response with a unique request ID for log correlation
app.use((_req, res, next) => {
  res.setHeader('X-Request-Id', `mmr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  next();
});

// Static tool registry — mirrors src/constants/tools.ts on the frontend
app.get('/api/tools', (req, res) => {
  res.json({
    tools: [
      { id: 1, slug: 'chat', name: 'Chat', price: '0.005' },
      { id: 2, slug: 'tweet', name: 'Tweet', price: '0.005' },
      { id: 3, slug: 'reflect', name: 'Reflect', price: '0.005' },
      { id: 4, slug: 'pattern', name: 'Pattern', price: '0.005' },
      { id: 5, slug: 'letter', name: 'Letter', price: '0.01' },
    ],
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    network: 'celo-mainnet',
    contract: process.env.CONTRACT_ADDRESS,
    paymentToken: 'USDm',
    groqConfigured: !!process.env.GROQ_API_KEY,
    agent8004Id: process.env.AGENT_8004_ID || null,
    selfAgentId: process.env.SELF_AGENT_ID || null,
  });
});

app.post('/api/reflection/email', async (req, res) => {
  const { email, name, content, type } = req.body; // type: 'reflection' | 'pattern'
  if (!email || !content) return res.status(400).json({ error: 'Missing email or content' });

  // Requires a real MicroMind session — ties every send to an accountable
  // identity so this can't be used as an anonymous open email relay.
  const senderId = await resolveUserId(req.headers.authorization);
  if (!senderId) return res.status(401).json({ error: 'Sign in required to send email.' });

  if (!resend) return res.status(503).json({ error: 'Email not configured' });

  const subject = type === 'pattern'
    ? 'Your Emotional Patterns — MicroMind'
    : 'Your Weekly Reflection — MicroMind';

  const greeting = name ? `Hi ${name},` : 'Hi,';

  try {
    await resend.emails.send({
      from: RESEND_FROM,
      to: email,
      subject,
      text: `${greeting}\n\nHere's your MicroMind insight:\n\n${content}\n\n---\nGenerated privately on MicroMind · micromind.app`,
    });
    res.json({ success: true });
  } catch (e) {
    const err = e as Error;
    console.error('[REFLECTION EMAIL]', err.message);
    res.status(500).json({ error: 'Email delivery failed' });
  }
});

app.post('/api/letter/send', async (req, res) => {
  const { content, recipientEmail, senderName } = req.body;
  console.log('[LETTER] Free send request received for recipient:', recipientEmail);

  if (!content || !recipientEmail || !senderName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  // Requires a real MicroMind session — this is a free feature, but without an
  // auth check it doubles as an open, anonymous email relay for arbitrary
  // content to arbitrary recipients.
  const senderId = await resolveUserId(req.headers.authorization);
  if (!senderId) return res.status(401).json({ error: 'Sign in required to send a letter.' });

  try {
    await sendEmail(recipientEmail, senderName, content);
    res.json({ success: true });
  } catch (e) {
    const err = e as Error;
    console.error('[LETTER] Free send failed:', err);
    res.status(500).json({ error: err.message || 'Email delivery failed' });
  }
});

app.post('/api/letter/polish', async (req, res) => {
  const { content, recipientEmail, senderName, txHash } = req.body;
  console.log('[POLISH] Request for recipient:', recipientEmail);

  if (!content || !senderName) {
    return res.status(400).json({ error: 'Missing required fields: content, senderName' });
  }
  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({ error: 'Missing txHash' });
  }

  try {
    // Paid as tool 5 ("Letter" pricing, 0.01 USDm) — this previously had no
    // payment check at all, unlike every other paid AI endpoint.
    const verifyError = await verifyPaymentEvent(txHash, 5);
    if (verifyError) {
      return res.status(402).json({ error: verifyError });
    }

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: 'system', content: SYSTEM_PROMPTS[5] },
        { role: 'user', content },
      ],
    });

    const polished = completion.choices[0]?.message?.content ?? '';
    console.log('[POLISH] AI done, length:', polished.length);

    let sent = false;
    if (recipientEmail) {
      try {
        await sendEmail(recipientEmail, senderName, polished);
        sent = true;
      } catch (e) {
        const err = e as Error;
        console.error('[POLISH] Email send failed:', err.message);
      }
    }

    if (txHash) {
      await storeData(`resp:${txHash}`, polished, 86400);
    }

    res.json({ polishedContent: polished, sent });
  } catch (e) {
    const err = e as Error;
    console.error('[POLISH] Error:', err.message);
    res.status(500).json({ error: err.message || 'Polish failed' });
  }
});

app.post('/api/coach', async (req, res) => {
  const { prompt, txHash } = req.body;
  if (!prompt || !txHash) {
    return res.status(400).json({ error: 'Missing prompt or txHash' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Coach is always paid as tool 1 ("Chat" pricing) — see src/app/app/coach/page.tsx.
    const verifyError = await verifyPaymentEvent(txHash, 1);
    if (verifyError) {
      res.write(`data: ${JSON.stringify({ error: verifyError })}\n\n`);
      return res.end();
    }

    console.log('[COACH] Streaming AI advice for prompt...');
    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 1024,
      temperature: 0.7,
      messages: [
        { role: 'system', content: COACH_SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      stream: true,
    });

    let fullText = '';
    for await (const chunk of completion) {
      const text = chunk.choices[0]?.delta?.content || '';
      if (text) {
        fullText += text;
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    // Cache the full response under resp:txHash so history or polling check still works
    await storeData(`resp:${txHash}`, fullText, 86400);

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    const errorVal = err as Error;
    console.error('[COACH STREAMING ERROR]', errorVal);
    res.write(`data: ${JSON.stringify({ error: errorVal.message || 'AI coach failed' })}\n\n`);
    res.end();
  }
});

app.post('/api/cron/release-letters', async (req, res) => {
  console.log('[CRON] Starting release letters check...');

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  // Fail closed: this endpoint decrypts real letter content and sends real
  // emails, so a missing CRON_SECRET must reject every request, not skip
  // the check and let anyone call it.
  if (!cronSecret) {
    console.error('[CRON] FATAL: CRON_SECRET is not configured — refusing all requests.');
    return res.status(503).json({ error: 'Cron endpoint not configured' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized (missing service role key)' });
  }

  try {
    const now = new Date().toISOString();
    const { data: letters, error: fetchError } = await supabase
      .from('scheduled_letters')
      .select('*')
      .eq('status', 'pending')
      .lte('release_date', now);

    if (fetchError) throw fetchError;

    if (!letters || letters.length === 0) {
      console.log('[CRON] No pending letters to release.');
      return res.json({ success: true, count: 0 });
    }

    console.log(`[CRON] Found ${letters.length} pending letters to release.`);
    let successCount = 0;

    for (const letter of letters) {
      try {
        console.log(`[CRON] Processing letter ${letter.id} for ${letter.recipient_email}...`);

        const decryptedContent = decryptAESGCM(letter.ciphertext, letter.iv, letter.key_hex);

        await sendEmail(letter.recipient_email, letter.sender_name, decryptedContent);

        const { error: updateError } = await supabase
          .from('scheduled_letters')
          .update({ status: 'sent' })
          .eq('id', letter.id);

        if (updateError) throw updateError;
        successCount++;
      } catch (err) {
        const errorVal = err as Error;
        console.error(`[CRON] Failed to release letter ${letter.id}:`, errorVal.message);
        try {
          await supabase
            .from('scheduled_letters')
            .update({ status: 'failed' })
            .eq('id', letter.id);
        } catch (updateErr) {
          const updateErrorVal = updateErr as Error;
          console.error('[CRON] Failed to update status to failed:', updateErrorVal.message);
        }
      }
    }

    res.json({ success: true, count: successCount });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[CRON ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Cron failed' });
  }
});

// ─── Reminder Push Cron ───────────────────────────────────────────────────
// Sends a real Web Push notification to anyone who hasn't journaled in 24h
// and hasn't already been reminded in roughly the last day. Runs hourly via
// .github/workflows/send-reminder-pushes-cron.yml.
app.post('/api/cron/send-reminder-pushes', async (req, res) => {
  console.log('[CRON] Starting reminder push check...');

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[CRON] FATAL: CRON_SECRET is not configured — refusing all requests.');
    return res.status(503).json({ error: 'Cron endpoint not configured' });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized (missing service role key)' });
  }
  if (!vapidConfigured) {
    return res.status(503).json({ error: 'VAPID keys not configured on this server' });
  }

  try {
    const { data: subscriptions, error: fetchError } = await supabase
      .from('push_subscriptions')
      .select('*');

    if (fetchError) throw fetchError;

    if (!subscriptions || subscriptions.length === 0) {
      console.log('[CRON] No push subscriptions to check.');
      return res.json({ success: true, sent: 0 });
    }

    let sentCount = 0;
    const now = Date.now();

    for (const sub of subscriptions) {
      try {
        const { data: entries } = await supabase
          .from('journal_entries')
          .select('timestamp')
          .eq('user_id', sub.user_id)
          .order('timestamp', { ascending: false })
          .limit(1);

        const lastEntryAt = entries?.[0]?.timestamp ?? 0;
        const hoursSinceEntry = (now - lastEntryAt) / (1000 * 60 * 60);
        if (hoursSinceEntry < 24) continue;

        if (sub.last_reminder_sent_at) {
          const hoursSinceReminder = (now - new Date(sub.last_reminder_sent_at).getTime()) / (1000 * 60 * 60);
          if (hoursSinceReminder < 20) continue;
        }

        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify({
            title: 'MicroMind',
            body: "You haven't journaled yet today. Want to take 2 minutes?",
            url: '/app/journal',
          }),
        );

        await supabase
          .from('push_subscriptions')
          .update({ last_reminder_sent_at: new Date().toISOString() })
          .eq('id', sub.id);

        sentCount++;
      } catch (err) {
        const errorVal = err as { statusCode?: number; message?: string };
        if (errorVal.statusCode === 404 || errorVal.statusCode === 410) {
          console.log(`[CRON] Subscription ${sub.id} expired/revoked — removing.`);
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error(`[CRON] Failed to send push for subscription ${sub.id}:`, errorVal.message);
        }
      }
    }

    res.json({ success: true, sent: sentCount });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[CRON ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Cron failed' });
  }
});

// ─── Story Challenge Admin Routes ──────────────────────────────────────────
// Opening/finalizing a challenge period are operator actions, not something
// any signed-in user should be able to trigger. Two ways in:
//   1. CRON_SECRET bearer token — for automated/scripted use (unattended cron).
//   2. /api/admin/* — session-based, for the /app/admin dashboard, gated by
//      admin_users (see docs/admin_users.sql and lib/admin.ts).
// Both call the same shared logic in lib/stories-admin.ts. Submitting a
// story and voting are ordinary authenticated writes handled directly by the
// frontend against Supabase (see docs/story_challenges.sql for the RLS
// policies that enforce ownership, timing windows, and no-self-voting).
function requireCronSecret(req: express.Request, res: express.Response): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error('[STORIES] FATAL: CRON_SECRET is not configured — refusing all requests.');
    res.status(503).json({ error: 'Endpoint not configured' });
    return false;
  }
  if (req.headers.authorization !== `Bearer ${cronSecret}`) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}

app.post('/api/stories/challenges/open', async (req, res) => {
  if (!requireCronSecret(req, res)) return;
  const result = await openStoryChallenge(req.body);
  res.status(result.status).json(result.body);
});

app.post('/api/stories/challenges/finalize', async (req, res) => {
  if (!requireCronSecret(req, res)) return;
  const result = await finalizeStoryChallenges(req.body?.challengeId);
  res.status(result.status).json(result.body);
});

// ─── Admin Dashboard Routes ─────────────────────────────────────────────────

app.get('/api/admin/check', async (req, res) => {
  const admin = await resolveAdminUser(req.headers.authorization);
  res.json({ isAdmin: !!admin });
});

app.get('/api/admin/stories/challenges', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const challenges = await listStoryChallengesWithStats();
  res.json({ challenges });
});

app.post('/api/admin/stories/challenges/open', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const result = await openStoryChallenge(req.body);
  res.status(result.status).json(result.body);
});

app.post('/api/admin/stories/challenges/finalize', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  const result = await finalizeStoryChallenges(req.body?.challengeId);
  res.status(result.status).json(result.body);
});

app.get('/api/admin/admins', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id, email, created_at')
    .order('created_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ admins: data ?? [] });
});

app.post('/api/admin/admins', async (req, res) => {
  const admin = await requireAdmin(req, res);
  if (!admin) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

  const { email } = req.body;
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Missing email' });
  }
  const cleanEmail = email.trim().toLowerCase();

  try {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile) {
      return res.status(404).json({ error: 'No account found with that email. They must sign up first.' });
    }

    const { error: insertError } = await supabase
      .from('admin_users')
      .insert({ user_id: profile.id, email: profile.email, added_by: admin.id });

    if (insertError) {
      if (insertError.code === '23505') return res.status(409).json({ error: 'Already an admin.' });
      throw insertError;
    }

    res.json({ success: true });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[ADMIN] Failed to add admin:', errorVal.message);
    res.status(500).json({ error: errorVal.message || 'Failed to add admin' });
  }
});

app.delete('/api/admin/admins/:userId', async (req, res) => {
  if (!(await requireAdmin(req, res))) return;
  if (!supabase) return res.status(500).json({ error: 'Supabase client not initialized' });

  try {
    const { count } = await supabase
      .from('admin_users')
      .select('user_id', { count: 'exact', head: true });

    if ((count ?? 0) <= 1) {
      return res.status(400).json({ error: 'Cannot remove the last remaining admin.' });
    }

    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('user_id', req.params.userId);

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[ADMIN] Failed to remove admin:', errorVal.message);
    res.status(500).json({ error: errorVal.message || 'Failed to remove admin' });
  }
});

app.post('/api/game/reframe', async (req, res) => {
  const { sentence, targetWord, txHash } = req.body;
  if (!sentence || !targetWord || !txHash) {
    return res.status(400).json({ error: 'Missing sentence, targetWord, or txHash' });
  }

  try {
    // Paid as tool 1 ("Chat" pricing) via payViaRelay(1, ...) — see quest/page.tsx.
    const verifyError = await verifyPaymentEvent(txHash, 1);
    if (verifyError) {
      return res.status(402).json({ error: verifyError });
    }

    console.log('[GAME REFRAME] Querying AI reframe...');
    const prompt = `Sentence: "${sentence}"\nTarget Word: "${targetWord}"`;
    const systemPrompt = `You are a warm, supportive cognitive behavioral therapy (CBT) assistant. The user has just refined a simple thought into a more precise mindful emotion.
The original context:
"${sentence}"
The user solved and clarified the emotion as:
"${targetWord}"

Generate a beautiful, inspiring "Clarity Reframing Card" structured exactly as follows:
1. Affirmation: A powerful, first-person positive reframing affirmation (1 sentence, e.g. "I honor my need for rest and allow my energy to replenish without guilt.")
2. Coaching Question: A single targeted, open-ended question that prompts them to think about how they can embody this precise state in their life (1 sentence).

Write in a comforting, friendly tone. Do not write anything else. Keep it under 60 words total.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 256,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    const cardText = completion.choices[0]?.message?.content ?? '';
    await storeData(`resp:${txHash}`, cardText, 86400);

    res.json({ cardText });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[GAME REFRAME ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Failed to generate reframe' });
  }
});

app.post('/api/game/hint', async (req, res) => {
  const { sentence, targetWord, scrambledLetters, txHash } = req.body;
  if (!sentence || !targetWord || !scrambledLetters || !txHash) {
    return res.status(400).json({ error: 'Missing sentence, targetWord, scrambledLetters, or txHash' });
  }

  try {
    // Paid as tool 1 ("Chat" pricing) via payViaRelay(1, ...) — see quest/page.tsx.
    const verifyError = await verifyPaymentEvent(txHash, 1);
    if (verifyError) {
      return res.status(402).json({ error: verifyError });
    }

    console.log('[GAME HINT] Querying AI hint...');
    const prompt = `Sentence: "${sentence}"\nLetters: ${JSON.stringify(scrambledLetters)}\nWord: "${targetWord}"`;
    const systemPrompt = `You are a gentle emotional vocabulary guide. The user is learning a more precise feeling word and needs a supportive clue.
The sentence containing the target word:
"${sentence}"
The scrambled letters they have: ${JSON.stringify(scrambledLetters)}
The target word they are looking for: ${targetWord}

Generate a short, warm hint (under 30 words) that describes the meaning of the target word and how it fits the sentence. Provide guidance without explicitly spelling the target word itself. Keep it kind and encouraging.`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 128,
      temperature: 0.7,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    const hintText = completion.choices[0]?.message?.content ?? '';
    await storeData(`resp:${txHash}`, hintText, 86400);

    res.json({ hintText });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[GAME HINT ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Failed to generate hint' });
  }
});

app.post('/api/quest/withdraw', relayRateLimiter, async (req, res) => {
  const authHeader = req.headers.authorization;
  const { userAddress, points } = req.body;

  if (!authHeader || !userAddress || !points || points < 10) {
    return res.status(400).json({ error: 'Missing auth header, userAddress, or invalid points (min 10)' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(400).json({ error: 'Invalid auth token format' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database service not configured on backend relayer' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized or invalid session' });
    }

    const { data: progress, error: progressError } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (progressError || !progress) {
      console.error('[WITHDRAW ERROR] Database fetch failed for user', user.id, ':', progressError);
      return res.status(404).json({
        error: `Quest progress record not found. Details: ${progressError?.message || 'No record found on Supabase. Try logging out and logging back in to force a sync.'}`
      });
    }

    if (progress.clarity_points < points) {
      return res.status(400).json({ error: 'Insufficient clarity points for this withdrawal' });
    }

    const amountWei = BigInt(points) * 500_000_000_000_000n;

    // Compare-and-swap on the balance we just read — guards against two concurrent
    // withdrawals both passing the balance check above and both paying out, since
    // only the request whose WHERE clause still matches the untouched balance will
    // affect a row. If a concurrent request already moved the balance, zero rows
    // come back and we abort here, before any on-chain transfer is attempted.
    const newPointsCount = progress.clarity_points - points;
    const { data: updatedRows, error: updateError } = await supabase
      .from('quest_progress')
      .update({ clarity_points: newPointsCount, updated_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .eq('clarity_points', progress.clarity_points)
      .select();

    if (updateError) {
      throw new Error(`Failed to update points record: ${updateError.message}`);
    }
    if (!updatedRows || updatedRows.length === 0) {
      return res.status(409).json({ error: 'Your balance changed. Please refresh and try again.' });
    }

    const privateKey = process.env.PRIVATE_KEY as `0x${string}`;
    if (!privateKey) {
      throw new Error('Relayer private key not configured on server');
    }

    const { privateKeyToAccount } = await import('viem/accounts');
    const { createWalletClient, erc20Abi } = await import('viem');
    const account = privateKeyToAccount(privateKey);

    const walletClient = createWalletClient({
      account,
      chain: celo,
      transport: http('https://rpc.ankr.com/celo'),
    });

    const USDM_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

    console.log(`[WITHDRAW] Transferring ${amountWei.toString()} Wei of USDm to ${userAddress}...`);
    const txHash = await walletClient.writeContract({
      address: USDM_ADDRESS,
      abi: erc20Abi,
      functionName: 'transfer',
      args: [userAddress as `0x${string}`, amountWei],
      account,
      chain: celo,
    });

    console.log('[WITHDRAW] Transfer transaction sent:', txHash);

    res.json({ success: true, txHash, newPoints: newPointsCount });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[WITHDRAW ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Withdrawal failed' });
  }
});

const DEFAULT_QUEST_STATE = {
  current_level: 1,
  current_stage: 1,
  completed_levels: [] as number[],
  clarity_points: 0,
};

// ─── Quest Solve Route ────────────────────────────────────────────────────
// The client can no longer write clarity_points directly (RLS now blocks
// it — see docs/quest_security_hardening.sql). Instead it submits the word
// it assembled, and this endpoint independently verifies it against the
// server's own copy of the level data (agent/src/lib/quest-levels.ts)
// before granting any points, and only advances the row via a compare-and-
// swap on the caller's *current* level/stage so a race can't double-award.
app.post('/api/quest/solve', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { levelNumber, stageIndex, submittedWord, forfeited } = req.body;

  if (
    !authHeader ||
    typeof levelNumber !== 'number' ||
    typeof stageIndex !== 'number' ||
    typeof submittedWord !== 'string'
  ) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(400).json({ error: 'Invalid auth token format' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database service not configured on backend relayer' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized or invalid session' });
    }

    const stageNumber = stageIndex + 1;

    let { data: progress } = await supabase
      .from('quest_progress')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!progress) {
      const { data: inserted, error: insertError } = await supabase
        .from('quest_progress')
        .insert({ user_id: user.id, ...DEFAULT_QUEST_STATE, updated_at: new Date().toISOString() })
        .select()
        .single();
      if (insertError || !inserted) {
        throw new Error(`Failed to initialize quest progress: ${insertError?.message}`);
      }
      progress = inserted;
    }

    if (levelNumber !== progress.current_level || stageNumber !== progress.current_stage) {
      return res.status(409).json({ error: 'Stage mismatch — refresh your progress and try again.' });
    }

    const expectedWord = getTargetWord(levelNumber, stageNumber);
    if (!expectedWord || submittedWord.trim().toUpperCase() !== expectedWord) {
      return res.status(400).json({ error: 'Incorrect answer.' });
    }

    const totalStages = getStageCount(levelNumber);
    let nextLevel = levelNumber;
    let nextStage = stageNumber + 1;
    let nextCompleted: number[] = [...(progress.completed_levels || [])];
    const pointsEarned = forfeited ? 0 : levelNumber;

    if (nextStage > totalStages) {
      nextCompleted = Array.from(new Set([...nextCompleted, levelNumber]));
      if (levelNumber < TOTAL_LEVELS) {
        nextLevel = levelNumber + 1;
        nextStage = 1;
      } else {
        nextStage = totalStages;
      }
    }

    const nextPoints = (progress.clarity_points || 0) + pointsEarned;

    // Compare-and-swap on the exact (level, stage) we validated against — a
    // concurrent duplicate solve of the same stage will find zero rows here
    // once the first request commits, since current_stage will have moved on.
    const { data: updatedRows, error: updateError } = await supabase
      .from('quest_progress')
      .update({
        current_level: nextLevel,
        current_stage: nextStage,
        completed_levels: nextCompleted,
        clarity_points: nextPoints,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('current_level', levelNumber)
      .eq('current_stage', stageNumber)
      .select()
      .single();

    if (updateError || !updatedRows) {
      return res.status(409).json({ error: 'Stage already advanced — refresh your progress.' });
    }

    res.json({
      success: true,
      progress: {
        currentLevel: updatedRows.current_level,
        currentStage: updatedRows.current_stage,
        completedLevels: updatedRows.completed_levels || [],
        clarityPoints: updatedRows.clarity_points || 0,
      },
      pointsEarned,
    });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[QUEST SOLVE ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Failed to record stage solve' });
  }
});

// ─── Quest Reset Route ────────────────────────────────────────────────────
// Resetting only ever zeroes a user's own progress, never grants value, so
// this is safe to expose without the compare-and-swap machinery above.
app.post('/api/quest/reset', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(400).json({ error: 'Missing auth header' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(400).json({ error: 'Invalid auth token format' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Database service not configured on backend relayer' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized or invalid session' });
    }

    const { error } = await supabase
      .from('quest_progress')
      .upsert({ user_id: user.id, ...DEFAULT_QUEST_STATE, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      progress: {
        currentLevel: DEFAULT_QUEST_STATE.current_level,
        currentStage: DEFAULT_QUEST_STATE.current_stage,
        completedLevels: DEFAULT_QUEST_STATE.completed_levels,
        clarityPoints: DEFAULT_QUEST_STATE.clarity_points,
      },
    });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[QUEST RESET ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Failed to reset progress' });
  }
});

// ─── Quest Vocabulary Route ───────────────────────────────────────────────
// quest_vocabulary is a personal word-definitions cache with no points/
// currency tied to it — the content itself isn't a security boundary, so
// unlike /api/quest/solve this doesn't re-derive the vocabulary server-side.
// What it DOES enforce is that the row is written by the agent under the
// caller's own verified user_id (docs/quest_vocabulary_hardening.sql revokes
// direct client writes), not that the definition/examples/synonyms are correct.
app.post('/api/quest/vocabulary', async (req, res) => {
  const authHeader = req.headers.authorization;
  const { stageId, levelName, category, targetWord, definition, examples, synonyms } = req.body;

  if (!authHeader || !stageId || !levelName || !category || !targetWord || !definition) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(400).json({ error: 'Invalid auth token format' });
  }
  if (!supabase) {
    return res.status(500).json({ error: 'Database service not configured on backend relayer' });
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return res.status(401).json({ error: 'Unauthorized or invalid session' });
    }

    const { error } = await supabase.from('quest_vocabulary').upsert(
      {
        user_id: user.id,
        stage_id: stageId,
        level_name: levelName,
        category,
        target_word: targetWord,
        definition,
        examples: examples || [],
        synonyms: synonyms || [],
        unlocked_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,stage_id' }
    );

    if (error) throw new Error(error.message);
    res.json({ success: true });
  } catch (err) {
    const errorVal = err as Error;
    console.error('[QUEST VOCABULARY ERROR]', errorVal);
    res.status(500).json({ error: errorVal.message || 'Failed to save vocabulary entry' });
  }
});

app.post('/api/prompt/submit', async (req, res) => {
  console.log('[SUBMIT] Received:', req.body);
  const { prompt, toolId, userAddress, nonce: reqNonce } = req.body;
  
  if (!prompt || toolId === undefined || !userAddress) {
    console.log('[SUBMIT] Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  const userId = await resolveUserId(req.headers.authorization);

  const { keccak256, toBytes } = await import('viem');
  const nonce = reqNonce || Date.now().toString();
  const promptHash = keccak256(
    toBytes(`${prompt}:${userAddress}:${nonce}`)
  );

  console.log('[SUBMIT] promptHash:', promptHash);
  await storeData(`prompt:${promptHash}`, JSON.stringify({
    prompt, toolId: Number(toolId), user: userAddress, nonce, userId
  }));
  
  res.json({ promptHash });
  console.log('[SUBMIT] Done');
});

app.get('/api/response/:txHash', async (req, res) => {
  const { txHash } = req.params;
  console.log('[RESPONSE] Checking for:', txHash);
  
  try {
    const response = await getData(`resp:${txHash}`);
    console.log('[RESPONSE] Found in cache:', response ? 'YES' : 'NO');
    
    if (response) {
      return res.json({ status: 'ready', response });
    }

    // Attempt to process from event if not in cache
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt) {
      console.log('[RESPONSE] No receipt found yet');
      return res.json({ status: 'pending' });
    }

    const log = receipt.logs.find(l => l.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase());
    if (!log) {
      console.log('[RESPONSE] No contract log found');
      return res.json({ status: 'pending' });
    }

    const event = decodeEventLog({
      abi: MICROMIND_ABI,
      eventName: 'PromptPaid',
      data: log.data,
      topics: log.topics,
    });

    const { promptHash, toolId } = event.args as { promptHash?: string; toolId?: number | bigint };
    const storedStr = await getData(`prompt:${promptHash}`);
    if (!storedStr) {
      console.log('[RESPONSE] Prompt source not found for hash:', promptHash);
      return res.json({ status: 'prompt_not_found', promptHash });
    }

    const { prompt, userId } = JSON.parse(storedStr);
    console.log('[RESPONSE] Calling AI for tool:', toolId);
    if (toolId === undefined) {
      console.log('[RESPONSE] toolId is undefined in event log');
      return res.json({ status: 'pending' });
    }
    const parsedToolId = Number(toolId);
    const aiResponse = await callAI(parsedToolId, prompt);

    await storeData(`resp:${txHash}`, aiResponse, 86400);

    if (userId) {
      const info = TOOL_INFO[parsedToolId];
      recordPromptHistory({
        user_id: userId,
        tool_id: parsedToolId,
        tool_name: info?.name ?? `Tool ${parsedToolId}`,
        prompt,
        response: aiResponse,
        cost: info ? `${info.price} USDm` : 'unknown',
        tx_hash: txHash,
      });
    }

    res.json({ status: 'ready', response: aiResponse });
  } catch (e) {
    console.error('[RESPONSE] Error:', e);
    res.json({ status: 'pending' });
  }
});

app.post('/api/process-direct', async (req, res) => {
  const { txHash, prompt, toolId } = req.body;
  console.log('[DIRECT] Processing:', { txHash, toolId });

  const parsedToolId = parseInt(toolId, 10);
  if (!Number.isInteger(parsedToolId) || parsedToolId < 1 || parsedToolId > 5) {
    return res.status(400).json({ error: 'Invalid toolId: must be an integer between 1 and 5' });
  }
  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({ error: 'Missing txHash' });
  }

  try {
    const verifyError = await verifyPaymentEvent(txHash, parsedToolId);
    if (verifyError) {
      return res.status(402).json({ status: 'error', message: verifyError });
    }

    const response = await callAI(parsedToolId, prompt);

    await storeData(`resp:${txHash}`, response, 86400);
    console.log('[DIRECT] Success, response length:', response.length);

    const userId = await resolveUserId(req.headers.authorization);
    if (userId) {
      const info = TOOL_INFO[parsedToolId];
      recordPromptHistory({
        user_id: userId,
        tool_id: parsedToolId,
        tool_name: info?.name ?? `Tool ${parsedToolId}`,
        prompt,
        response,
        cost: info ? `${info.price} USDm` : 'unknown',
        tx_hash: txHash,
      });
    }

    res.json({ status: 'ready', response });
  } catch (e) {
    const err = e as Error;
    console.error('[DIRECT] Failed:', err.message);
    res.status(500).json({ 
      status: 'error', 
      message: err.message 
    });
  }
});

// ─── Relay Route ──────────────────────────────────────────────────────────────
// Accepts an EIP-712 signed relay request from the frontend.
// Verifies the signature, executes approve + payForPrompt from the developer
// wallet (paying native CELO gas), then triggers AI generation.
app.post('/api/relay', relayRateLimiter, async (req, res) => {
  const { signature, toolId, promptHash, userAddress, nonce, deadline, prompt } = req.body;

  if (!signature || !toolId || !promptHash || !userAddress || !nonce || !deadline || !prompt) {
    return res.status(400).json({ error: 'Missing required relay fields' });
  }

  const userId = await resolveUserId(req.headers.authorization);

  const parsedToolId = parseInt(toolId, 10);
  if (!Number.isInteger(parsedToolId) || parsedToolId < 1 || parsedToolId > 5) {
    return res.status(400).json({ error: 'Invalid toolId' });
  }

  if (!isDeadlineValid(deadline)) {
    return res.status(400).json({ error: 'Request expired. Please try again.' });
  }

  const params = { signature, toolId: parsedToolId, promptHash, userAddress, nonce, deadline };
  const isValid = await verifyRelaySignature(params);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature. Could not verify request authenticity.' });
  }

  // Atomically claim the nonce (persisted — survives restarts) to prevent
  // replay/double-spend, including two concurrent requests for the same
  // signed payload racing each other.
  const claimed = await claimNonce(userAddress, nonce);
  if (!claimed) {
    return res.status(400).json({ error: 'Nonce already used. This request was already processed.' });
  }

  console.log(`[RELAY] Valid request from ${userAddress} for tool ${parsedToolId}`);

  // Execute relay: developer wallet pays gas + USDm, then AI is generated
  const result = await executeRelay(
    params,
    CONTRACT_ADDRESS,
    process.env.PAYMENT_TOKEN as `0x${string}`,
    MICROMIND_ABI,
  );

  if (!result.success) {
    console.error('[RELAY] On-chain execution failed:', result.error);
    return res.status(500).json({ error: result.error || 'Relay execution failed' });
  }

  try {
    const aiResponse = await callAI(parsedToolId, prompt);
    await storeData(`resp:${result.txHash}`, aiResponse, 86400);
    console.log(`[RELAY] AI cached under txHash: ${result.txHash}`);

    if (userId) {
      const info = TOOL_INFO[parsedToolId];
      recordPromptHistory({
        user_id: userId,
        tool_id: parsedToolId,
        tool_name: info?.name ?? `Tool ${parsedToolId}`,
        prompt,
        response: aiResponse,
        cost: info ? `${info.price} USDm` : 'unknown',
        tx_hash: result.txHash,
      });
    }

    res.json({ status: 'ready', txHash: result.txHash, response: aiResponse });
  } catch (e) {
    const err = e as Error;
    console.error('[RELAY] AI generation failed:', err.message);
    // Payment went through but AI generation failed — cache the prompt context
    // (mirroring /api/prompt/submit's shape) so a later /api/response/:txHash
    // poll can still find it and attribute the eventual history record.
    await storeData(`prompt:${promptHash}`, JSON.stringify({
      prompt, toolId: parsedToolId, user: userAddress, nonce, userId
    }));
    res.json({ status: 'processing', txHash: result.txHash });
  }
});

// ─── Challenge Relay Route ───────────────────────────────────────────────────
// Accepts an EIP-712 signed relay request for staking challenge operations.
// Verifies the signature, executes startChallengeFor, checkInFor, or withdrawFor.
app.post('/api/challenge/relay', relayRateLimiter, async (req, res) => {
  const { signature, action, entryHash, userAddress, nonce, deadline } = req.body;

  if (!signature || action === undefined || !entryHash || !userAddress || !nonce || !deadline) {
    return res.status(400).json({ error: 'Missing required challenge relay fields' });
  }

  const parsedAction = parseInt(action, 10);
  if (!Number.isInteger(parsedAction) || parsedAction < 1 || parsedAction > 3) {
    return res.status(400).json({ error: 'Invalid action' });
  }

  if (!STAKING_CONTRACT_ADDRESS) {
    return res.status(500).json({ error: 'Staking contract address not configured on relayer' });
  }

  if (!isDeadlineValid(deadline)) {
    return res.status(400).json({ error: 'Request expired. Please try again.' });
  }

  const params = { signature, action: parsedAction, entryHash, userAddress, nonce, deadline };
  const isValid = await verifyChallengeRelaySignature(params, STAKING_CONTRACT_ADDRESS);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature. Could not verify request authenticity.' });
  }

  // Atomically claim the nonce (persisted — survives restarts) to prevent replay.
  const claimed = await claimNonce(userAddress, nonce);
  if (!claimed) {
    return res.status(400).json({ error: 'Nonce already used.' });
  }

  console.log(`[RELAY-CHALLENGE] Valid request from ${userAddress} for action ${parsedAction}`);

  const result = await executeChallengeRelay(
    params,
    STAKING_CONTRACT_ADDRESS,
    MICROMIND_STAKING_ABI,
  );

  if (!result.success) {
    console.error('[RELAY-CHALLENGE] On-chain execution failed:', result.error);
    return res.status(500).json({ error: result.error || 'Relay execution failed' });
  }

  res.json({ status: 'ready', txHash: result.txHash });
});

// ─── Voice dictation ──────────────────────────────────────────────────────────
// Free utility, not a priced tool — it's an input method for the existing
// free-to-write journal textarea, not a distinct AI generation. Still requires
// a signed-in session so it can't be used as an anonymous Groq quota drain.
const transcribeUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB — generous for a short voice note
});

app.post('/api/transcribe', transcribeUpload.single('audio'), async (req, res) => {
  const userId = await resolveUserId(req.headers.authorization);
  if (!userId) return res.status(401).json({ error: 'Sign in required to use voice dictation.' });

  if (!req.file) return res.status(400).json({ error: 'Missing audio file' });

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: new File([new Uint8Array(req.file.buffer)], req.file.originalname || 'note.webm', {
        type: req.file.mimetype || 'audio/webm',
      }),
      model: 'whisper-large-v3',
    });
    res.json({ text: transcription.text });
  } catch (e) {
    const err = e as Error;
    console.error('[TRANSCRIBE] Failed:', err.message);
    res.status(500).json({ error: 'Transcription failed' });
  }
});

initStorage().then(() => {
  app.listen(port, () => {
    console.log(`Agent running on port ${port}`);
  });
});
