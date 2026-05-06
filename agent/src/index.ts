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
  transport: http(),
});

// Storage Setup (Redis or Memory)
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
    // Auto-delete after TTL
    setTimeout(() => memoryStore.delete(key), ttl * 1000);
  }
}

async function getData(key: string): Promise<string | null> {
  if (useRedis) {
    return await redis.get(key);
  }
  return memoryStore.get(key) ?? null;
}

// AI Integration
const SYSTEM_PROMPTS: Record<number, string> = {
  0: "You are a helpful AI assistant. Be concise, clear, and genuinely useful.",
  1: "You are a professional resume writer. Create ATS-optimized, impactful content. Format clearly with sections.",
  2: "You are a Twitter/X copywriter. Write punchy, engaging tweets under 280 characters. Make them shareable.",
  3: "You are a personal branding expert. Write compelling, authentic professional bios."
};

async function callAI(toolId: number, prompt: string): Promise<string> {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      max_tokens: 800,
      temperature: 0.7,
      messages: [
        { role: "system", content: SYSTEM_PROMPTS[toolId] ?? SYSTEM_PROMPTS[0] },
        { role: "user", content: prompt }
      ]
    });
    return completion.choices[0]?.message?.content ?? "No response generated.";
  } catch (error) {
    console.error('Groq Error:', error);
    return "AI generation failed. Please try again.";
  }
}

// Middleware
app.use(express.json());
app.use(cors());

// Endpoints
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    network: IS_TESTNET ? 'alfajores' : 'celo',
    contractAddress: CONTRACT_ADDRESS 
  });
});

app.post('/api/prompt/submit', async (req, res) => {
  const { prompt, toolId, userAddress } = req.body;
  if (!prompt || toolId === undefined) return res.status(400).json({ error: 'Missing data' });

  // In a real app, you'd hash this or store it with a lookup
  // For simplicity, we'll use the promptHash requested by the user
  const { keccak256, encodePacked } = await import('viem');
  const nonce = Date.now();
  const promptHash = keccak256(
    encodePacked(['string', 'address', 'uint256'], [prompt, userAddress as `0x${string}`, BigInt(nonce)])
  );

  await storeData(`prompt:${promptHash}`, JSON.stringify({ prompt, toolId }));
  res.json({ promptHash });
});

app.get('/api/response/:txHash', async (req, res) => {
  const { txHash } = req.params;
  const cached = await getData(`resp:${txHash}`);
  
  if (cached) {
    return res.json({ status: 'ready', response: cached });
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt) return res.json({ status: 'pending' });

    // Find the PromptPaid log
    const log = receipt.logs.find(l => l.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase());
    if (!log) return res.status(400).json({ error: 'No payment log found' });

    const event = decodeEventLog({
      abi: MICROMIND_ABI,
      eventName: 'PromptPaid',
      data: log.data,
      topics: log.topics,
    });

    const { promptHash, toolId } = event.args as any;
    const storedStr = await getData(`prompt:${promptHash}`);
    if (!storedStr) return res.status(404).json({ error: 'Prompt not found' });

    const { prompt } = JSON.parse(storedStr);
    const response = await callAI(toolId, prompt);
    
    await storeData(`resp:${txHash}`, response, 86400); // Cache for 24h
    res.json({ status: 'ready', response });
  } catch (error) {
    res.json({ status: 'pending' });
  }
});

// Start Server
initStorage().then(() => {
  app.listen(port, () => {
    console.log(`Agent running on port ${port}`);
  });
});
