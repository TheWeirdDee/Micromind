import { NextResponse } from 'next/server';
import { keccak256, encodePacked } from 'viem';

// In-memory store (will reset on redeploy, use Redis/KV for production)
const promptStore = new Map<string, { prompt: string; user: string; toolId: number }>();

export async function POST(req: Request) {
  try {
    const { prompt, address, toolId, nonce } = await req.json();

    if (!prompt || !address || toolId === undefined) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const promptHash = keccak256(
      encodePacked(
        ['string', 'address', 'uint256'],
        [prompt, address as `0x${string}`, BigInt(nonce)]
      )
    );

    // Store prompt off-chain for the agent to find later
    // @ts-ignore
    global.promptStore = global.promptStore || new Map();
    // @ts-ignore
    global.promptStore.set(promptHash, { prompt, address, toolId });

    return NextResponse.json({ promptHash });
  } catch (error) {
    console.error('Submit error:', error);
    return NextResponse.json({ error: 'Failed to submit' }, { status: 500 });
  }
}
