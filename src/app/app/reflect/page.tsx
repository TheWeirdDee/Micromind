'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, BookOpen, Sparkles, HelpCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { AgentWarning } from '@/components/app/AgentWarning';
import { getEntries, getRecentEntries, updateStreak, type JournalEntry } from '@/lib/journal';
import { getHistory } from '@/lib/storage';

import { Suspense } from 'react';

function ReflectPageInner() {
  const { address, celoBalance } = useWallet();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string }>(null);

  const { payAndGenerate, loading, step } = usePayForPrompt();
  const searchParams = useSearchParams();

  const hasNoCelo = Number(celoBalance) < 0.0005;

  useEffect(() => {
    setEntries(getRecentEntries(7));
    
    const historyId = searchParams.get('id');
    if (historyId) {
      const history = getHistory();
      const item = history.find(h => h.txHash === historyId);
      if (item && item.toolId === 3) {
        setResponse(item.response);
      }
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (entries.length < 2) return;
    try {
      const formattedPrompt = entries
        .map(e => `Date: ${e.date} | Mood: ${e.mood}\nEntry: ${e.content}`)
        .join('\n\n---\n\n');

      setLastSubmission({ toolId: 3, toolName: 'Reflect', prompt: formattedPrompt });

      const aiResponse = await payAndGenerate(3, 'Reflect', formattedPrompt);
      if (aiResponse) {
        setResponse(aiResponse);
        updateStreak(address);
      }
    } catch (err: any) {
      console.error(err);
      alert('Transaction failed. Make sure you have enough cUSD and CELO in your wallet.');
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
      className="space-y-8 pb-24"
    >
      <AgentWarning />
      
      {/* Header */}
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">Weekly Reflection</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          0.005 cUSD
        </span>
      </header>

      {entries.length < 2 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-surface p-8">
          <HelpCircle className="w-12 h-12 text-text-muted/40 mb-4 animate-bounce" />
          <h3 className="text-lg font-serif mb-2 text-text-primary">More entries needed</h3>
          <p className="font-mono text-xs text-text-muted max-w-[260px] mb-6">
            Write at least 2 journal entries before reflecting on your emotional journey.
          </p>
          <Link href="/app/journal" className="pill-button pill-button-primary px-6 py-2.5 text-xs font-mono tracking-wider">
            Go to Journal
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Celo Gas Warning */}
          {hasNoCelo && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-xs text-red-200 font-mono leading-relaxed">
              ⚠️ You need a small amount of CELO for gas fees (~0.001 CELO per prompt). Get CELO via MiniPay or any Celo exchange before using AI tools.
            </div>
          )}

          {step === 'error' && (
            <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-sm text-red-100 flex items-center justify-between font-mono text-xs">
              <div>Payment failed. You can retry submission.</div>
              <div className="flex gap-2">
                <button onClick={handleRetry} disabled={loading} className="px-3 py-1 rounded bg-accent text-bg font-bold">Retry</button>
                <button onClick={() => setLastSubmission(null)} className="px-3 py-1 rounded border border-border">Dismiss</button>
              </div>
            </div>
          )}

          {/* Compact Entries Preview */}
          <div className="bg-surface border border-border p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-lg">Reflecting on {entries.length} recent {entries.length === 1 ? 'entry' : 'entries'}</h3>
            <div className="divide-y divide-border/60">
              {entries.map(e => (
                <div key={e.id} className="py-2.5 flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-2">
                    <span>{e.mood}</span>
                    <span className="text-text-muted">{e.date}</span>
                  </div>
                  <span className="text-text-muted/60 line-clamp-1 max-w-[150px] italic">
                    "{e.content.slice(0, 30)}..."
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleGenerate}
              disabled={loading || hasNoCelo}
              className="pill-button pill-button-primary w-full py-4 mt-2 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">{getStepMessage()}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Reflection</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {response && <ResponseCard response={response} />}
    </motion.div>
  );
}

export default function ReflectPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading context...</div>}>
      <ReflectPageInner />
    </Suspense>
  );
}
