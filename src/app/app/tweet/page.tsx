'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { TOOLS } from '@/constants/tools';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { getHistory } from '@/lib/storage';
import { AgentWarning } from '@/components/app/AgentWarning';

import { Suspense } from 'react';

function TweetPageInner() {
  const [topic, setTopic] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string }>(null);

  const { payAndGenerate, loading, step } = usePayForPrompt();
  const searchParams = useSearchParams();

  useEffect(() => {
    const historyId = searchParams.get('id');
    if (historyId) {
      const history = getHistory();
      const item = history.find(h => h.txHash === historyId);
      if (item && item.toolId === 2) {
        setResponse(item.response);
        setTopic(item.prompt);
      }
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    try {
      setLastSubmission({ toolId: 2, toolName: 'Tweet', prompt: topic });

      const aiResponse = await payAndGenerate(2, 'Tweet', topic);
      if (aiResponse) {
        setResponse(aiResponse);
      }
    } catch (err: any) {
      console.error(err);
      alert('Transaction failed. Make sure you have enough cUSD in your wallet.');
    }
  };

  const handleRetry = async () => {
    if (!lastSubmission || loading) return;
    try {
      const aiResponse = await payAndGenerate(lastSubmission.toolId, lastSubmission.toolName, lastSubmission.prompt);
      if (aiResponse) setResponse(aiResponse);
      setLastSubmission(null);
    } catch (e) {
      console.error('Retry failed', e);
      alert('Retry failed. Check your wallet and try again.');
    }
  };
  const getStepMessage = () => {
    switch (step) {
      case 'checking': return 'Checking agent...';
      case 'submitting': return 'Preparing prompt...';
      case 'approving': return 'Approving cUSD spend...';
      case 'paying': return 'Sending payment...';
      case 'confirming': return 'Confirming on Celo...';
      case 'generating': return 'AI is generating...';
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
          <h2 className="text-2xl font-serif">Tweet Gen</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          0.01 cUSD
        </span>
      </header>

      <div className="space-y-4">

        {step === 'error' && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-sm text-red-100 flex items-center justify-between">
            <div>Payment failed or cancelled. You can retry the last submission.</div>
            <div className="flex gap-2">
              <button onClick={handleRetry} disabled={loading} className="px-3 py-1 rounded bg-accent text-bg text-xs">Retry</button>
              <button onClick={() => setLastSubmission(null)} className="px-3 py-1 rounded border border-border text-xs">Dismiss</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Topic / Idea</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should the tweet be about?"
            className="w-full bg-surface border border-border rounded-xl p-4 font-mono text-sm min-h-[120px] focus:border-text-muted outline-none transition-colors resize-none"
          />
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim()}
          className="pill-button pill-button-primary w-full py-4 mt-4 disabled:opacity-40 group"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
          ) : (
            <>Generate Tweet <span className="group-hover:translate-x-1 transition-transform">→</span></>
          )}
        </button>
      </div>

      {response && <ResponseCard response={response} />}
    </motion.div>
  );
}

export default function TweetPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading context...</div>}>
      <TweetPageInner />
    </Suspense>
  );
}
