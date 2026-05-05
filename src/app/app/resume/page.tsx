'use client';

import { useState } from 'react';
import { ChevronLeft, Wallet, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/constants/tools';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { PaymentSteps } from '@/components/app/PaymentSteps';
import { ResponseCard } from '@/components/app/ResponseCard';
import { saveToHistory } from '@/lib/storage';

export default function ResumePage() {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    skills: '',
    experience: '',
  });
  const [response, setResponse] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { pay, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    const prompt = `Name: ${formData.name}\nRole: ${formData.role}\nSkills: ${formData.skills}\nExperience: ${formData.experience}`;
    
    try {
      const result = await pay(TOOLS.RESUME.id, prompt, TOOLS.RESUME.price);
      if (result) {
        const mockResponse = `${formData.name.toUpperCase()}\n${formData.role}\n\nSKILLS\n${formData.skills}\n\nEXPERIENCE\n${formData.experience}`;
        setResponse(mockResponse);
        setTxHash(result.txHash);
        saveToHistory({
          id: Math.random().toString(36).substring(7),
          toolId: TOOLS.RESUME.id,
          toolName: TOOLS.RESUME.name,
          prompt,
          response: mockResponse,
          cost: TOOLS.RESUME.price,
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
          <h2 className="text-2xl font-serif">Resume Gen</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          {TOOLS.RESUME.price} cUSD
        </span>
      </header>

      <div className="space-y-4">
        {['name', 'role', 'skills'].map((field) => (
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
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Experience</label>
          <textarea
            value={formData.experience}
            onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
            className="w-full bg-surface border border-border rounded-xl p-4 font-mono text-sm min-h-[120px] focus:border-text-muted outline-none transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !formData.name}
          className="pill-button pill-button-primary w-full py-4 mt-4 disabled:opacity-40 group"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Generate Resume <span className="group-hover:translate-x-1 transition-transform">→</span></>}
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
