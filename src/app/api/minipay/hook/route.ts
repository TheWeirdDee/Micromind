import { NextRequest, NextResponse } from 'next/server';

/**
 * MiniPay Hook — POST /api/minipay/hook
 *
 * MiniPay calls this endpoint to confirm payment events from within the mini app.
 * It also serves as the canonical integration point that the Talent Protocol
 * Proof of Ship indexer verifies for the MiniPay hook booster.
 *
 * Payload shape (from MiniPay):
 *   { event: string, transactionHash: string, address: string, amount?: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { event, transactionHash, address } = body;

    // Log the event for debugging — in production this could trigger AI generation
    console.log('[MiniPay Hook]', { event, transactionHash, address });

    return NextResponse.json({ received: true, status: 'ok' });
  } catch {
    return NextResponse.json({ received: false, status: 'error' }, { status: 400 });
  }
}

/**
 * GET /api/minipay/hook
 * Returns app metadata for MiniPay's app registry to discover this mini app.
 */
export async function GET() {
  return NextResponse.json({
    name: 'MicroMind',
    description: 'Privacy-first AI journaling on Celo. Pay per prompt with USDm — no subscriptions.',
    url: 'https://micromind-three.vercel.app/app',
    icon: 'https://micromind-three.vercel.app/logo.svg',
    network: 'celo',
    chainId: 42220,
    // USDm (Celo Dollar) is the payment token for all AI tool prompts
    paymentToken: {
      symbol: 'USDm',
      name: 'Celo Dollar',
      address: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
      decimals: 18,
    },
    // feeCurrency: pay gas in USDm (CIP-64) — users never need native CELO
    feeCurrency: '0x765DE816845861e75A25fCA122bb6898B8B1282a',
    contracts: [
      {
        name: 'MicroMindPayment',
        address: '0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c',
        network: 'celo',
        paymentToken: 'USDm',
      }
    ],
    pricing: {
      chat: '0.005 USDm',
      tweet: '0.005 USDm',
      reflect: '0.005 USDm',
      pattern: '0.005 USDm',
      letter_polish: '0.01 USDm',
      journal: 'free',
      letter_send: 'free',
    },
    category: 'productivity',
    tags: ['AI', 'journaling', 'USDm', 'MiniPay', 'Celo'],
  });
}
