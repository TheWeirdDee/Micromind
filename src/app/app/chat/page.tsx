'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Wallet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/constants/tools';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { PaymentSteps } from '@/components/app/PaymentSteps';
import { ResponseCard } from '@/components/app/ResponseCard';
import { saveToHistory } from '@/lib/storage';

export default function ChatPage() {
  const router = useRouter();
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { pay, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    try {
      const result = await pay(TOOLS.CHAT.id, prompt, TOOLS.CHAT.price);
      if (result) {
        // In reality, this would be the response from the agent
        const mockResponse = "MicroMind is a payment-native AI tool built for Celo. It enables friction-less AI access via MiniPay by using cUSD for per-prompt transactions. This model eliminates the need for subscriptions, making premium AI accessible to everyone.";
        
        setResponse(mockResponse);
        setTxHash(result.txHash);
        
        saveToHistory({
          id: Math.random().toString(36).substring(7),
          toolId: TOOLS.CHAT.id,
          toolName: TOOLS.CHAT.name,
          prompt,
          response: mockResponse,
          cost: TOOLS.CHAT.price,
          txHash: result.txHash,
          timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">AI Chat</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          {TOOLS.CHAT.price} cUSD
        </span>
      </header>

      <div className="space-y-6">
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
            placeholder={TOOLS.CHAT.placeholder}
            className="w-full bg-surface border border-border rounded-2xl p-6 font-mono text-sm min-h-[200px] focus:border-text-muted focus:outline-none transition-colors resize-none"
          />
          <span className="absolute bottom-4 right-6 font-mono text-[10px] text-text-muted opacity-40">
            {prompt.length}/500
          </span>
        </div>

        <div className="flex items-center gap-3 px-2">
          <Wallet className="w-4 h-4 text-accent-gold/60" />
          <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
            This will cost {TOOLS.CHAT.price} cUSD from your balance
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="pill-button pill-button-primary w-full py-4 disabled:opacity-40 disabled:cursor-not-allowed group"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Pay & Generate
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </>
          )}
        </button>
      </div>

      {loading && (
        <PaymentSteps 
          steps={[
            { label: 'Preparing prompt...', status: step >= 1 ? 'complete' : 'dim' },
            { label: 'Confirm in MiniPay...', status: step === 2 ? 'active' : step > 2 ? 'complete' : 'dim' },
            { label: 'Broadcasting to Celo...', status: step === 3 ? 'active' : step > 3 ? 'complete' : 'dim' },
            { label: 'AI is generating...', status: step === 4 ? 'active' : 'dim' },
          ]}
        />
      )}

      {response && <ResponseCard response={response} txHash={txHash || undefined} />}
    </div>
  );
}
