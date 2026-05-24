'use client';

import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { AgentWarning } from '@/components/app/AgentWarning';

export default function AuditorPage() {
  const [solidityCode, setSolidityCode] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const { payAndGenerate, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    if (!solidityCode.trim()) return;
    
    try {
      const aiResponse = await payAndGenerate(4, 'Auditor', solidityCode);
      if (aiResponse) {
        setResponse(aiResponse);
      }
    } catch (err: any) {
      console.error(err);
      alert('Transaction failed. Make sure you have enough cUSD in your wallet.');
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'checking': return 'Checking agent...';
      case 'submitting': return 'Preparing prompt...';
      case 'approving': return 'Approving cUSD spend...';
      case 'paying': return 'Sending payment...';
      case 'confirming': return 'Confirming on Celo...';
      case 'generating': return 'Auditing code...';
      case 'complete': return 'Done!';
      default: return 'Processing...';
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-8"
    >
      <AgentWarning />
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">Smart Contract Auditor</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          0.10 cUSD
        </span>
      </header>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Solidity Code</label>
          <textarea
            value={solidityCode}
            onChange={(e) => setSolidityCode(e.target.value)}
            placeholder="// Paste your smart contract code here..."
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-text-muted outline-none transition-colors h-64 resize-y"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !solidityCode.trim()}
          className="pill-button pill-button-primary w-full py-4 mt-4 disabled:opacity-40 group"
        >
          {loading ? (
            <div className="flex items-center gap-2 justify-center">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <span>Run Deep Audit</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </div>
          )}
        </button>
      </div>

      {response && <ResponseCard response={response} />}
    </motion.div>
  );
}
