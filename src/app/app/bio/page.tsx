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

export default function BioPage() {
  const [formData, setFormData] = useState({ name: '', role: '', keywords: '' });
  const [length, setLength] = useState<'Short' | 'Medium' | 'Long'>('Medium');
  const [response, setResponse] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { pay, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    const prompt = `Name: ${formData.name}, Role: ${formData.role}, Keywords: ${formData.keywords}, Length: ${length}`;
    try {
      const result = await pay(TOOLS.BIO.id, prompt, TOOLS.BIO.price);
      if (result) {
        const mockResponse = `${formData.name} is a ${formData.role} specializing in ${formData.keywords.split(',')[0] || 'innovation'}. Driven by curiosity and a passion for excellence, they are redefining the boundaries of ${formData.keywords.split(',')[1] || 'technology'}.`;
        setResponse(mockResponse);
        setTxHash(result.txHash);
        saveToHistory({
          id: Math.random().toString(36).substring(7),
          toolId: TOOLS.BIO.id,
          toolName: TOOLS.BIO.name,
          prompt,
          response: mockResponse,
          cost: TOOLS.BIO.price,
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
          <h2 className="text-2xl font-serif">Bio Gen</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          {TOOLS.BIO.price} cUSD
        </span>
      </header>

      <div className="space-y-4">
        {['name', 'role', 'keywords'].map((field) => (
          <div key={field} className="space-y-2">
            <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">{field}</label>
            <input
              type="text"
              value={(formData as any)[field]}
              onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
              className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-text-muted outline-none transition-colors"
            />
          </div>
        ))}
        
        <div className="space-y-2 pt-2">
          <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Bio Length</label>
          <div className="flex gap-2">
            {['Short', 'Medium', 'Long'].map((l) => (
              <button
                key={l}
                onClick={() => setLength(l as any)}
                className={cn(
                  "flex-1 py-2 rounded-full font-mono text-[10px] tracking-widest uppercase border transition-all",
                  length === l ? "bg-accent-gold/20 border-accent-gold text-accent-gold" : "bg-surface border-border text-text-muted"
                )}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !formData.name}
          className="pill-button pill-button-primary w-full py-4 mt-6 disabled:opacity-40 group"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Bio <span className="group-hover:translate-x-1 transition-transform">→</span></>}
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
