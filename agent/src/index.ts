import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import Groq from 'groq-sdk';
import rateLimit from 'express-rate-limit';
import { promptStore, responseStore } from './store';
import { createPublicClient, http, decodeEventLog, keccak256, encodePacked } from 'viem';
import { celo } from 'viem/chains';
import { MICROMIND_ABI } from '../../src/lib/contract'; // Adjusting path to shared ABI

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

// Middleware
app.use(express.json());
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:3002', 
    'https://micromind.vercel.app',
    /\.vercel\.app$/
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api/prompt/submit', limiter);

// AI Call Function
async function callAI(toolId: number, prompt: string): Promise<string> {
  const systemPrompts: Record<number, string> = {
    0: "You are a helpful AI assistant. Be concise, clear, and useful.",
    1: "You are a professional resume writer. Create structured, ATS-friendly, impactful resume content. Use clear sections.",
    2: "You are a viral Twitter/X copywriter. Write punchy, engaging tweets under 280 characters. No hashtag spam.",
    3: "You are a personal branding expert. Write short, memorable, professional bios that sound human not corporate."
  };

  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompts[toolId] ?? systemPrompts[0] },
        { role: "user", content: prompt }
      ]
    });
    return completion.choices[0].message.content ?? "No response generated.";
  } catch (error) {
    console.error('Groq AI Error:', error);
    return "Error generating response. Please try again.";
  }
}

// Endpoints
app.post('/api/prompt/submit', (req, res) => {
  const { prompt: p, toolId: t, userAddress: a } = req.body;

  if (!p || t === undefined || !a) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  const nonce = Date.now();
  const promptHash = keccak256(
    encodePacked(
      ['string', 'address', 'uint256'],
      [p, a as `0x${string}`, BigInt(nonce)]
    )
  );

  promptStore.set(promptHash, { prompt: p, toolId: t, userAddress: a });
  res.json({ promptHash });
});

app.get('/api/response/:txHash', async (req, res) => {
  const { txHash } = req.params;

  // Check if response already exists
  const existing = responseStore.get(txHash);
  if (existing) {
    return res.json({ status: 'ready', response: existing.response });
  }

  try {
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return res.json({ status: 'pending' });
    }

    const log = receipt.logs.find(
      (l) => l.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
    );

    if (!log) {
      return res.status(400).json({ error: 'No payment event found' });
    }

    const event = decodeEventLog({
      abi: MICROMIND_ABI,
      eventName: 'PromptPaid',
      data: log.data,
      topics: log.topics,
    });

    const { promptHash, toolId } = event.args as any;
    const stored = promptStore.get(promptHash);

    if (!stored) {
      return res.status(404).json({ error: 'Prompt content not found' });
    }

    const aiResponse = await callAI(toolId, stored.prompt);
    responseStore.set(txHash, aiResponse);

    res.json({ status: 'ready', response: aiResponse });
  } catch (error) {
    console.error('Processing error:', error);
    res.status(500).json({ error: 'Processing failed' });
  }
});

app.listen(port, () => {
  console.log(`Agent listening on port ${port}`);
});
