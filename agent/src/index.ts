import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import { MICROMIND_ABI } from './lib/contract';
import { Resend } from 'resend';
import {
  verifyRelaySignature,
  isNonceUsed,
  markNonceUsed,
  isDeadlineValid,
  executeRelay,
} from './lib/relayer';
import { decryptAESGCM } from './lib/crypto';
import { supabase } from './lib/supabase';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const IS_TESTNET = process.env.IS_TESTNET === 'true';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

// Fail fast — without a valid contract address the agent cannot decode events
if (!CONTRACT_ADDRESS || CONTRACT_ADDRESS === '0x0000000000000000000000000000000000000000') {
  console.error('[STARTUP] FATAL: CONTRACT_ADDRESS env var is missing or zero address. Exiting.');
  process.exit(1);
}

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const publicClient = createPublicClient({
  chain: celo,
  transport: http('https://rpc.ankr.com/celo')
});

let useRedis = false;
let redis: any = null;

async function initStorage() {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    try {
      const { Redis } = await import('@upstash/redis');
      redis = new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      });
      useRedis = true;
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
  if (useRedis) {
    await redis.set(key, value, { ex: ttl });
  } else {
    memoryStore.set(key, value);
    setTimeout(() => memoryStore.delete(key), ttl * 1000);
  }
}

async function getData(key: string): Promise<string | null> {
  if (useRedis) {
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
const RESEND_FROM = process.env.RESEND_FROM_EMAIL ?? 'MicroMind Letters <onboarding@resend.dev>';

async function sendEmail(to: string, senderName: string, content: string, isPolished: boolean) {
  if (!resend) {
    console.warn('[EMAIL] Resend not configured. Skipping email send.');
    return;
  }

  const subject = `A letter for you, from ${senderName}`;
  const text = isPolished
    ? `${content}\n\n---\nSent via MicroMind · https://micromind-three.vercel.app/app\n✨ This letter was enhanced with AI`
    : `${content}\n\n---\nSent via MicroMind · https://micromind-three.vercel.app/app`;

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
      } catch (e) {
        console.log('[AI] Failed to parse JSON prompt for Letter tool, using raw prompt');
      }
    }

    let messages: any[] = [
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
      sendEmail(recipientEmail, senderName, result, true).catch(err => {
        console.error('[EMAIL] Failed to send polished letter email:', err);
      });
    }

    return result;
  } catch (error: any) {
    console.error('[AI] Groq Error:', error.message);
    return `AI generation failed: ${error.message}`;
  }
}

// Limit request body to 50 KB to prevent payload-based DoS attacks
app.use(express.json({ limit: '50kb' }));
app.use(cors());

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

// Email a reflection/pattern result to the user
app.post('/api/reflection/email', async (req, res) => {
  const { email, name, content, type } = req.body; // type: 'reflection' | 'pattern'
  if (!email || !content) return res.status(400).json({ error: 'Missing email or content' });

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
  } catch (e: any) {
    console.error('[REFLECTION EMAIL]', e.message);
    res.status(500).json({ error: 'Email delivery failed' });
  }
});

app.post('/api/letter/send', async (req, res) => {
  const { content, recipientEmail, senderName } = req.body;
  console.log('[LETTER] Free send request received for recipient:', recipientEmail);

  if (!content || !recipientEmail || !senderName) {
    return res.status(400).json({ error: 'Missing fields' });
  }

  try {
    await sendEmail(recipientEmail, senderName, content, false);
    res.json({ success: true });
  } catch (e: any) {
    console.error('[LETTER] Free send failed:', e);
    res.status(500).json({ error: e.message || 'Email delivery failed' });
  }
});

app.post('/api/letter/polish', async (req, res) => {
  const { content, recipientEmail, senderName, txHash } = req.body;
  console.log('[POLISH] Request for recipient:', recipientEmail);

  if (!content || !senderName) {
    return res.status(400).json({ error: 'Missing required fields: content, senderName' });
  }

  try {
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
        await sendEmail(recipientEmail, senderName, polished, true);
        sent = true;
      } catch (e: any) {
        console.error('[POLISH] Email send failed:', e.message);
      }
    }

    if (txHash) {
      await storeData(`resp:${txHash}`, polished, 86400);
    }

    res.json({ polishedContent: polished, sent });
  } catch (e: any) {
    console.error('[POLISH] Error:', e.message);
    res.status(500).json({ error: e.message || 'Polish failed' });
  }
});

app.post('/api/coach', async (req, res) => {
  const { prompt, txHash } = req.body;
  if (!prompt || !txHash) {
    return res.status(400).json({ error: 'Missing prompt or txHash' });
  }

  // Set headers for Server-Sent Events (SSE)
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    // Verify transaction exists on Celo
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (!receipt || receipt.status !== 'success') {
        res.write(`data: ${JSON.stringify({ error: 'Invalid or pending payment transaction' })}\n\n`);
        return res.end();
      }
    } catch (e: any) {
      console.warn('[COACH] Tx verify failed (continuing for local/testnet development):', e.message);
    }

    // Call Groq streaming API
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
  } catch (err: any) {
    console.error('[COACH STREAMING ERROR]', err);
    res.write(`data: ${JSON.stringify({ error: err.message || 'AI coach failed' })}\n\n`);
    res.end();
  }
});

app.post('/api/cron/release-letters', async (req, res) => {
  console.log('[CRON] Starting release letters check...');

  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
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

        await sendEmail(letter.recipient_email, letter.sender_name, decryptedContent, false);

        const { error: updateError } = await supabase
          .from('scheduled_letters')
          .update({ status: 'sent' })
          .eq('id', letter.id);

        if (updateError) throw updateError;
        successCount++;
      } catch (err: any) {
        console.error(`[CRON] Failed to release letter ${letter.id}:`, err.message);
        try {
          await supabase
            .from('scheduled_letters')
            .update({ status: 'failed' })
            .eq('id', letter.id);
        } catch (updateErr: any) {
          console.error('[CRON] Failed to update status to failed:', updateErr.message);
        }
      }
    }

    res.json({ success: true, count: successCount });
  } catch (err: any) {
    console.error('[CRON ERROR]', err);
    res.status(500).json({ error: err.message || 'Cron failed' });
  }
});

app.post('/api/prompt/submit', async (req, res) => {
  console.log('[SUBMIT] Received:', req.body);
  const { prompt, toolId, userAddress, nonce: reqNonce } = req.body;
  
  if (!prompt || toolId === undefined || !userAddress) {
    console.log('[SUBMIT] Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { keccak256, toBytes } = await import('viem');
  const nonce = reqNonce || Date.now().toString();
  const promptHash = keccak256(
    toBytes(`${prompt}:${userAddress}:${nonce}`)
  );
  
  console.log('[SUBMIT] promptHash:', promptHash);
  await storeData(`prompt:${promptHash}`, JSON.stringify({
    prompt, toolId: Number(toolId), user: userAddress, nonce
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

    const { promptHash, toolId } = event.args as any;
    const storedStr = await getData(`prompt:${promptHash}`);
    if (!storedStr) {
      console.log('[RESPONSE] Prompt source not found for hash:', promptHash);
      return res.json({ status: 'prompt_not_found', promptHash });
    }

    const { prompt } = JSON.parse(storedStr);
    console.log('[RESPONSE] Calling AI for tool:', toolId);
    const aiResponse = await callAI(toolId, prompt);
    
    await storeData(`resp:${txHash}`, aiResponse, 86400);
    res.json({ status: 'ready', response: aiResponse });
  } catch (e) {
    console.error('[RESPONSE] Error:', e);
    res.json({ status: 'pending' });
  }
});

app.post('/api/process-direct', async (req, res) => {
  const { txHash, prompt, toolId, userAddress } = req.body;
  console.log('[DIRECT] Processing:', { txHash, toolId });

  // Validate toolId — must be an integer between 1 and 5 (inclusive)
  const parsedToolId = parseInt(toolId, 10);
  if (!Number.isInteger(parsedToolId) || parsedToolId < 1 || parsedToolId > 5) {
    return res.status(400).json({ error: 'Invalid toolId: must be an integer between 1 and 5' });
  }

  try {
    const response = await callAI(parsedToolId, prompt);
    
    await storeData(`resp:${txHash}`, response, 86400);
    console.log('[DIRECT] Success, response length:', response.length);
    
    res.json({ status: 'ready', response });
  } catch (e: any) {
    console.error('[DIRECT] Failed:', e.message);
    res.status(500).json({ 
      status: 'error', 
      message: e.message 
    });
  }
});

// ─── Relay Route ──────────────────────────────────────────────────────────────
// Accepts an EIP-712 signed relay request from the frontend.
// Verifies the signature, executes approve + payForPrompt from the developer
// wallet (paying native CELO gas), then triggers AI generation.
app.post('/api/relay', async (req, res) => {
  const { signature, toolId, promptHash, userAddress, nonce, deadline, prompt } = req.body;

  if (!signature || !toolId || !promptHash || !userAddress || !nonce || !deadline || !prompt) {
    return res.status(400).json({ error: 'Missing required relay fields' });
  }

  const parsedToolId = parseInt(toolId, 10);
  if (!Number.isInteger(parsedToolId) || parsedToolId < 1 || parsedToolId > 5) {
    return res.status(400).json({ error: 'Invalid toolId' });
  }

  // Validate deadline has not expired
  if (!isDeadlineValid(deadline)) {
    return res.status(400).json({ error: 'Request expired. Please try again.' });
  }

  // Replay attack protection
  if (isNonceUsed(userAddress, nonce)) {
    return res.status(400).json({ error: 'Nonce already used. This request was already processed.' });
  }

  // Verify EIP-712 signature
  const params = { signature, toolId: parsedToolId, promptHash, userAddress, nonce, deadline };
  const isValid = await verifyRelaySignature(params);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid signature. Could not verify request authenticity.' });
  }

  // Mark nonce as used immediately to prevent double-spend during async execution
  markNonceUsed(userAddress, nonce);

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

  // Trigger AI generation and cache under the relay txHash
  try {
    const aiResponse = await callAI(parsedToolId, prompt);
    await storeData(`resp:${result.txHash}`, aiResponse, 86400);
    console.log(`[RELAY] AI cached under txHash: ${result.txHash}`);
    res.json({ status: 'ready', txHash: result.txHash, response: aiResponse });
  } catch (e: any) {
    console.error('[RELAY] AI generation failed:', e.message);
    // Payment went through — return txHash so frontend can poll later
    res.json({ status: 'processing', txHash: result.txHash });
  }
});

initStorage().then(() => {
  app.listen(port, () => {
    console.log(`Agent running on port ${port}`);
  });
});
