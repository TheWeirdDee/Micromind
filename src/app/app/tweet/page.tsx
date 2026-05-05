'use client';

import { useState } from 'react';
import { ChevronLeft, Wallet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/constants/tools';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { PaymentSteps } from '@/components/app/PaymentSteps';
import { ResponseCard } from '@/components/app/ResponseCard';
import { saveToHistory } from '@/lib/storage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function TweetPage() {
  const [prompt, setPrompt] = useState('');
  const [tone, setTone] = useState<'Casual' | 'Professional' | 'Viral'>('Viral');
  const [response, setResponse] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { pay, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    try {
      const result = await pay(TOOLS.TWEET.id, `${tone} tone: ${prompt}`, TOOLS.TWEET.price);
      if (result) {
        const mockResponse = `Building with @Celo is like magic. Micro-payments, AI, and mobile-first design all in one place. 💸✨\n\nCheck out MicroMind on MiniPay. Pay only for the AI you use. #Web3 #AI #Celo`;
        setResponse(mockResponse);
        setTxHash(result.txHash);
        saveToHistory({
          id: Math.random().toString(36).substring(7),
          toolId: TOOLS.TWEET.id,
          toolName: TOOLS.TWEET.name,
          prompt,
          response: mockResponse,
          cost: TOOLS.TWEET.price,
          txHash: result.txHash,
          timestamp: Date.now(),
        });
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">Tweet Gen</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          {TOOLS.TWEET.price} cUSD
        </span>
      </header>

      <div className="space-y-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={TOOLS.TWEET.placeholder}
          className="w-full bg-surface border border-border rounded-2xl p-6 font-mono text-sm min-h-[150px] focus:border-text-muted outline-none transition-colors resize-none"
        />

        <div className="flex gap-2 px-2 overflow-x-auto pb-2 scrollbar-hide">
          {['Casual', 'Professional', 'Viral'].map((t) => (
            <button
              key={t}
              onClick={() => setTone(t as any)}
              className={cn(
                "px-4 py-1.5 rounded-full font-mono text-[10px] tracking-widest uppercase border transition-all",
                tone === t ? "bg-accent-gold/20 border-accent-gold text-accent-gold" : "bg-surface border-border text-text-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !prompt.trim()}
          className="pill-button pill-button-primary w-full py-4 disabled:opacity-40 group"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Tweet <span className="group-hover:translate-x-1 transition-transform">→</span></>}
        </button>
      </div>

      {loading && <PaymentSteps steps={[
        { label: 'Preparing prompt...', status: step >= 1 ? 'complete' : 'dim' },
        { label: 'Confirm in MiniPay...', status: step === 2 ? 'active' : step > 2 ? 'complete' : 'dim' },
        { label: 'Broadcasting to Celo...', status: step === 3 ? 'active' : step > 3 ? 'complete' : 'dim' },
        { label: 'AI is generating...', status: step === 4 ? 'active' : 'dim' },
      ]} />}

      {response && <ResponseCard response={response} txHash={txHash || undefined} />}
    </div>
  );
}
