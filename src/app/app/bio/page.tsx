'use client';

import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/constants/tools';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';

import { AgentWarning } from '@/components/app/AgentWarning';

export default function BioPage() {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    keywords: '',
  });
  const [response, setResponse] = useState<string | null>(null);
  const { payAndGenerate, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    const prompt = `Name: ${formData.name}, Role: ${formData.role}, Keywords: ${formData.keywords}`;
    
    try {
      const aiResponse = await payAndGenerate(3, 'Bio', prompt);
      if (aiResponse) {
        setResponse(aiResponse);
      }
    } catch (err: any) {
      console.error(err);
      alert('Transaction failed. Make sure you have enough CELO in your wallet.');
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'checking': return 'Checking agent...';
      case 'submitting': return 'Preparing prompt...';
      case 'paying': return 'Confirm in wallet...';
      case 'confirming': return 'Confirming payment...';
      case 'generating': return 'AI is thinking...';
      case 'complete': return 'Done!';
      default: return 'Processing...';
    }
  };

  return (
    <div className="space-y-8">
      <AgentWarning />
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">Bio Generator</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          0.002 CELO
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

        <button
          onClick={handleGenerate}
          disabled={loading || !formData.name}
          className="pill-button pill-button-primary w-full py-4 mt-4 disabled:opacity-40 group"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
          ) : (
            <>Generate Bio <span className="group-hover:translate-x-1 transition-transform">→</span></>
          )}
        </button>
      </div>

      {response && <ResponseCard response={response} />}
    </div>
  );
}
