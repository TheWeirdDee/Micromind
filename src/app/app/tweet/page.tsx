'use client';

import { useState } from 'react';
import { ChevronLeft, Loader2, PenTool, AlertTriangle, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { getHistory } from '@/lib/storage';
import { AgentWarning } from '@/components/app/AgentWarning';
import { useWallet } from '@/context/WalletContext';
import { getLastEntry, updateStreak, type JournalEntry } from '@/lib/journal';
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ConnectWalletModal = dynamic(
  () => import('@/components/app/ConnectWalletModal').then((m) => m.ConnectWalletModal),
  { ssr: false }
);

function TweetPageInner({ historyId }: { historyId: string | null }) {
  const { isConnected, address, celoBalance, isMiniPay } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [topic, setTopic] = useState<string>(() => {
    if (!historyId) return '';
    const item = getHistory().find(h => h.txHash === historyId);
    return (item && item.toolId === 2) ? item.prompt : '';
  });
  const [response, setResponse] = useState<string | null>(() => {
    if (!historyId) return null;
    const item = getHistory().find(h => h.txHash === historyId);
    return (item && item.toolId === 2) ? item.response : null;
  });
  const [lastEntry] = useState<JournalEntry | null>(() =>
    typeof window !== 'undefined' ? getLastEntry() : null
  );
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string }>(null);

  const { payAndGenerate, payViaRelay, loading, step, error, reset } = usePayForPrompt();

  const hasNoCelo = isConnected && !isMiniPay && Number(celoBalance) < 0.0005;

  const handleGenerate = async () => {
    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    setLastSubmission({ toolId: 2, toolName: 'Tweet', prompt: topic });
    const aiResponse = isMiniPay
      ? await payViaRelay(2, 'Tweet', topic)
      : await payAndGenerate(2, 'Tweet', topic);
    if (aiResponse) {
      setResponse(aiResponse);
      updateStreak(address);
    }
  };

  const handleRetry = async () => {
    if (!lastSubmission || loading) return;

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    const aiResponse = isMiniPay
      ? await payViaRelay(lastSubmission.toolId, lastSubmission.toolName, lastSubmission.prompt)
      : await payAndGenerate(lastSubmission.toolId, lastSubmission.toolName, lastSubmission.prompt);
    if (aiResponse) {
      setResponse(aiResponse);
      setLastSubmission(null);
    }
  };
  const getStepMessage = () => {
    switch (step) {
      case 'checking': return 'Checking agent...';
      case 'submitting': return 'Preparing prompt...';
      case 'approving': return 'Approving USDm spend...';
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
          0.005 USDm
        </span>
      </header>

      <div className="space-y-4">
        {hasNoCelo && (
          <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-xs text-red-200 font-mono leading-relaxed flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
            <span>This wallet needs a small amount of CELO for gas fees (~0.001 CELO per prompt). Open MicroMind inside the MiniPay app instead for a fully gasless experience — no CELO required there.</span>
          </div>
        )}

        {step === 'error' && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-xs text-red-100 flex items-center justify-between font-mono">
            <div>{error || 'Payment failed. You can retry.'}</div>
            <div className="flex gap-2 ml-3 shrink-0">
              <button onClick={handleRetry} disabled={loading} className="px-3 py-1 rounded bg-accent text-bg font-bold">Retry</button>
              <button onClick={() => { setLastSubmission(null); reset(); }} className="px-3 py-1 rounded border border-border">Dismiss</button>
            </div>
          </div>
        )}
        <div className="space-y-2">
          <div className="flex justify-between items-center px-2">
            <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest">Topic / Idea</label>
            {lastEntry && (
              <button
                onClick={() => setTopic(lastEntry.content)}
                className="text-[10px] font-mono text-accent hover:underline flex items-center gap-1.5 focus:outline-none"
              >
                <PenTool className="w-3 h-3" />
                <span>Use Last Journal Entry</span>
              </button>
            )}
          </div>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What should the tweet be about? Or import your last journal entry..."
            className="w-full bg-surface border border-border rounded-xl p-4 font-mono text-sm min-h-[120px] focus:border-accent outline-none transition-colors resize-none"
          />
          <div className="flex justify-between items-center px-1 mt-1">
            <span className={`text-[10px] font-mono ${
              topic.length > 280 ? 'text-yellow-400' : 'text-transparent'
            }`}>
              ⚠ Exceeds 280 chars — tweet may be trimmed
            </span>
            <span className={`text-[10px] font-mono ${
              topic.length > 280 ? 'text-yellow-400' : 'text-text-muted'
            }`}>
              {topic.length} chars
            </span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !topic.trim() || hasNoCelo}
          className="pill-button pill-button-primary w-full py-4 mt-4 disabled:opacity-40 group"
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{getStepMessage()}</span>
            </div>
          ) : (
            <>Generate Tweet <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></>
          )}
        </button>
      </div>

      {response && (
        <ResponseCard response={response} onRegenerate={handleGenerate} regenerating={loading} />
      )}
      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </motion.div>
  );
}

function TweetPageLoader() {
  const searchParams = useSearchParams();
  const historyId = searchParams.get('id');
  return <TweetPageInner key={historyId ?? 'new'} historyId={historyId} />;
}

export default function TweetPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading context...</div>}>
      <TweetPageLoader />
    </Suspense>
  );
}
