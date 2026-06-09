'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, BookOpen, Search, HelpCircle, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { AgentWarning } from '@/components/app/AgentWarning';
import { getEntries, getEntriesByFolder, getFolders, updateStreak, type JournalEntry } from '@/lib/journal';
import { getHistory } from '@/lib/storage';
import { ConnectWalletModal } from '@/components/app/ConnectWalletModal';
import ReactMarkdown from 'react-markdown';

import { Suspense } from 'react';

function PatternPageInner() {
  const { isConnected, address, celoBalance } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string }>(null);

  const { payAndGenerate, loading, step } = usePayForPrompt();
  const searchParams = useSearchParams();

  const hasNoCelo = isConnected && Number(celoBalance) < 0.0005;

  const folderParam = searchParams.get('folder');
  const folderName  = folderParam
    ? getFolders().find(f => f.id === folderParam)?.name
    : null;

  useEffect(() => {
    setEntries(folderParam ? getEntriesByFolder(folderParam) : getEntries());

    const historyId = searchParams.get('id');
    if (historyId) {
      const history = getHistory();
      const item = history.find(h => h.txHash === historyId);
      if (item && item.toolId === 4) {
        setResponse(item.response);
      }
    }
  }, [searchParams]);

  const handleGenerate = async () => {
    if (entries.length < 5) return;

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      const formattedPrompt = entries
        .map(e => `Date: ${e.date} | Mood: ${e.mood}\nEntry: ${e.content}`)
        .join('\n\n---\n\n');

      setLastSubmission({ toolId: 4, toolName: 'Pattern', prompt: formattedPrompt });

      const aiResponse = await payAndGenerate(4, 'Pattern', formattedPrompt);
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

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

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

  // Helper to parse patterns into separate cards if they match standard formats
  const renderPatternCards = (text: string) => {
    // Try to split on Pattern 1, Pattern 2, Pattern 3 or similar
    const splitRegex = /(?:^|\n)(?:Pattern \d+:?|\d+\.\s+)/i;
    const parts = text.split(splitRegex);
    const patternItems = parts.slice(1).map(p => p.trim()).filter(Boolean);

    if (patternItems.length >= 3) {
      return (
        <div className="grid grid-cols-1 gap-4">
          {patternItems.slice(0, 3).map((item, index) => {
            // Find the title (usually first line or bold text)
            const lines = item.split('\n');
            const rawTitle = lines[0].replace(/^[#*\s-]+|[#*\s-]+$/g, '');
            const rest = lines.slice(1).join('\n');

            return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-surface border border-border p-5 rounded-2xl relative overflow-hidden group hover:border-accent-gold/40 transition-colors"
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-accent-gold" />
                <h4 className="font-serif text-lg text-accent-gold mb-2 pl-2">{rawTitle || `Pattern ${index + 1}`}</h4>
                <div className="prose prose-invert prose-sm font-mono text-xs text-text-muted leading-relaxed pl-2">
                  <ReactMarkdown>{rest}</ReactMarkdown>
                </div>
              </motion.div>
            );
          })}
        </div>
      );
    }

    // Fallback to standard response card if parsing doesn't yield discrete cards
    return <ResponseCard response={text} />;
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
          <Link href="/app/journal" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <div>
            <h2 className="text-2xl font-serif">Emotional Patterns</h2>
            {folderName && (
              <p className="text-xs font-mono text-accent/70 mt-0.5">
                Folder: {folderName}
                <Link href="/app/pattern" className="ml-2 text-text-muted/60 hover:text-text-muted underline">clear</Link>
              </p>
            )}
          </div>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          0.005 cUSD
        </span>
      </header>

      {entries.length < 5 ? (
        <div className="flex flex-col items-center justify-center text-center p-8 border border-dashed border-border rounded-2xl bg-surface">
          <HelpCircle className="w-12 h-12 text-text-muted/40 mb-4 animate-bounce" />
          <h3 className="text-lg font-serif mb-2 text-text-primary">More entries needed</h3>
          <p className="font-mono text-xs text-text-muted max-w-[260px] mb-6">
            Write at least 5 journal entries to discover recurring emotional patterns across your journal.
          </p>
          <Link href="/app/journal" className="pill-button pill-button-primary px-6 py-2.5 text-xs font-mono tracking-wider">
            Go to Journal
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Celo Gas Warning */}
          {hasNoCelo && (
            <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-xs text-red-200 font-mono leading-relaxed flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <span>You need a small amount of CELO for gas fees (~0.001 CELO per prompt). Get CELO via MiniPay or any Celo exchange before using AI tools.</span>
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

          {/* Analyze CTA */}
          <div className="bg-surface border border-border p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-lg">Analyze {entries.length} journal entries</h3>
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              AI will analyze all entries to identify exactly 3 recurring emotional patterns or themes in your thoughts, offering gentle, actionable insights.
            </p>

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
                  <Search className="w-4 h-4" />
                  <span>Discover Patterns</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {response && (
        <div className="space-y-4">
          <h3 className="font-serif text-xl px-2">Identified Patterns</h3>
          {renderPatternCards(response)}
        </div>
      )}
      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </motion.div>
  );
}

export default function PatternPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading context...</div>}>
      <PatternPageInner />
    </Suspense>
  );
}
