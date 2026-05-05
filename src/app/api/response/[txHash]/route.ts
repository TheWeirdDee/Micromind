import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';
import Groq from 'groq-sdk';
import { createPublicClient, http, decodeEventLog } from 'viem';
import { celo } from 'viem/chains';
import { MICROMIND_ABI } from '@/lib/contract';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

export async function GET(
  req: Request,
  { params }: { params: { txHash: string } }
) {
  const { txHash } = params;

  try {
    // 1. Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return NextResponse.json({ status: 'pending' });
    }

    // 2. Find the PromptPaid event
    const log = receipt.logs.find(
      (l) => l.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()
    );

    if (!log) {
      return NextResponse.json({ error: 'No payment event found' }, { status: 400 });
    }

    const event = decodeEventLog({
      abi: MICROMIND_ABI,
      eventName: 'PromptPaid',
      data: log.data,
      topics: log.topics,
    });

    // @ts-ignore
    const { promptHash, toolId } = event.args;

    // 3. Lookup prompt from off-chain store
    // @ts-ignore
    const stored = global.promptStore?.get(promptHash);

    if (!stored) {
      return NextResponse.json({ error: 'Prompt content not found' }, { status: 404 });
    }

    const systemPrompts = {
      0: 'You are a helpful AI assistant. Be concise.',
      1: 'You are a professional resume generator. Format as text.',
      2: 'You are a viral tweet generator. Max 280 chars.',
      3: 'You are a professional bio generator.',
    };

    let response = '';

    // 4. Try Groq (Main)
    try {
      const groqCompletion = await groq.chat.completions.create({
        messages: [
          // @ts-ignore
          { role: 'system', content: systemPrompts[toolId] || 'Be helpful.' },
          { role: 'user', content: stored.prompt },
        ],
        model: 'llama-3.3-70b-versatile',
      });
      response = groqCompletion.choices[0].message.content || '';
    } catch (groqError) {
      console.error('Groq failed, falling back to OpenAI:', groqError);
      
      // 5. Fallback to OpenAI
      const openaiCompletion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          // @ts-ignore
          { role: 'system', content: systemPrompts[toolId] || 'Be helpful.' },
          { role: 'user', content: stored.prompt },
        ],
      });
      response = openaiCompletion.choices[0].message.content || '';
    }

    return NextResponse.json({ 
      status: 'ready', 
      response,
      toolId
    });
  } catch (error) {
    console.error('Response error:', error);
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }
}
