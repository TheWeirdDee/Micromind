import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { celo, celoAlfajores } from 'viem/chains';
import { MICROMIND_ABI } from './lib/contract';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;
const IS_TESTNET = process.env.IS_TESTNET === 'true';
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const publicClient = createPublicClient({
  chain: IS_TESTNET ? celoAlfajores : celo,
  transport: http(
    IS_TESTNET 
      ? 'https://celo-sepolia.drpc.org'
      : 'https://forno.celo.org'
  )
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

const SYSTEM_PROMPTS: Record<number, string> = {
  0: "Current Date: May 2026. You are a highly advanced AI assistant. Provide direct, accurate, and informational responses. IMPORTANT: Do NOT include any meta-commentary about transactions, payments, CELO, your processing status, or 'MicroMind'. Just answer the user's question directly.",
  1: "Current Date: May 2026. You are a professional resume writer. Create ATS-optimized resumes. Do not mention any platform details or payments.",
  2: "Current Date: May 2026. You are a viral Twitter copywriter. Write punchy tweets. No meta-talk.",
  3: "Current Date: May 2026. You are a personal branding expert. Write compelling bios. No meta-talk."
};

async function callAI(toolId: number, prompt: string): Promise<string> {
  try {
    console.log(`[AI] Generating for tool ${toolId}...`);
    
    let messages: any[] = [
      { role: "system", content: SYSTEM_PROMPTS[toolId] ?? SYSTEM_PROMPTS[0] }
    ];

    // Check if prompt is a JSON array of messages (chat history)
    try {
      if (prompt.trim().startsWith('[') && prompt.trim().endsWith(']')) {
        const history = JSON.parse(prompt);
        if (Array.isArray(history)) {
          messages = [...messages, ...history];
        } else {
          messages.push({ role: "user", content: prompt });
        }
      } else {
        messages.push({ role: "user", content: prompt });
      }
    } catch {
      messages.push({ role: "user", content: prompt });
    }

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 1024,
      temperature: 0.7,
      messages
    });
    
    const result = completion.choices[0]?.message?.content ?? "No response generated.";
    console.log(`[AI] Success! Response length: ${result.length}`);
    return result;
  } catch (error: any) {
    console.error('[AI] Groq Error:', error.message);
    return `AI generation failed: ${error.message}`;
  }
}

app.use(express.json());
app.use(cors());

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    network: IS_TESTNET ? 'alfajores' : 'celo',
    contractAddress: CONTRACT_ADDRESS 
  });
});

app.post('/api/prompt/submit', async (req, res) => {
  console.log('[SUBMIT] Received:', req.body);
  const { prompt, toolId, userAddress } = req.body;
  
  if (!prompt || toolId === undefined || !userAddress) {
    console.log('[SUBMIT] Missing fields');
    return res.status(400).json({ error: 'Missing fields' });
  }

  const { keccak256, toBytes } = await import('viem');
  const nonce = Date.now().toString();
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
      return res.json({ status: 'pending' });
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
  
  try {
    const response = await callAI(Number(toolId), prompt);
    
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

initStorage().then(() => {
  app.listen(port, () => {
    console.log(`Agent running on port ${port}`);
  });
});
