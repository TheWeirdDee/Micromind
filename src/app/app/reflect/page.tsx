'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, Loader2, BookOpen, Sparkles, HelpCircle, AlertTriangle, Smile, Mail, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { AgentWarning } from '@/components/app/AgentWarning';
import { getEntriesByFolder, getRecentEntries, getFolders, updateStreak, MOOD_ICONS, type JournalEntry } from '@/lib/journal';
import { getHistory } from '@/lib/storage';
import { ConnectWalletModal } from '@/components/app/ConnectWalletModal';

import { Suspense } from 'react';

function ReflectPageInner() {
  const { isConnected, address, celoBalance } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string }>(null);

  const [emailSending, setEmailSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const { payAndGenerate, loading, step } = usePayForPrompt();
  const searchParams = useSearchParams();

  const hasNoCelo = isConnected && Number(celoBalance) < 0.0005;

  const folderParam = searchParams.get('folder');
  const folderName  = folderParam
    ? getFolders().find(f => f.id === folderParam)?.name
    : null;

  useEffect(() => {
    if (folderParam) {
      setEntries(getEntriesByFolder(folderParam).slice(0, 10));
    } else {
      setEntries(getRecentEntries(7));
    }

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

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

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

  const handleEmailReflection = async (overrideEmail?: string) => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
    if (!agentUrl || !response) return;

    let email = overrideEmail;
    if (!email) {
      try {
        const profile = JSON.parse(localStorage.getItem('mm_user_profile') || '{}');
        email = profile.email;
      } catch {}
    }

    if (!email) {
      setShowEmailInput(true);
      return;
    }

    let name = '';
    try { name = JSON.parse(localStorage.getItem('mm_user_profile') || '{}').name || ''; } catch {}

    setEmailSending(true);
    try {
      await fetch(`${agentUrl}/api/reflection/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, content: response, type: 'reflection' }),
      });
      setEmailSent(true);
      setShowEmailInput(false);
    } catch (e) {
      alert('Failed to send email. Please try again.');
    } finally {
      setEmailSending(false);
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
            <h2 className="text-2xl font-serif">Weekly Reflection</h2>
            {folderName && (
              <p className="text-xs font-mono text-accent/70 mt-0.5">
                Folder: {folderName}
                <Link href="/app/reflect" className="ml-2 text-text-muted/60 hover:text-text-muted underline">clear</Link>
              </p>
            )}
          </div>
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

          {/* Compact Entries Preview */}
          <div className="bg-surface border border-border p-5 rounded-2xl space-y-4">
            <h3 className="font-serif text-lg">Reflecting on {entries.length} recent {entries.length === 1 ? 'entry' : 'entries'}</h3>
            <div className="divide-y divide-border/60">
              {entries.map(e => (
                <div key={e.id} className="py-2.5 flex justify-between items-center text-xs font-mono">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = MOOD_ICONS[e.mood] || Smile;
                      return <Icon className="w-4 h-4 text-accent" />;
                    })()}
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

      {response && (
        <div className="space-y-3">
          <ResponseCard response={response} />

          {/* Email button */}
          <div className="flex flex-col gap-2 pt-1">
            {emailSent ? (
              <div className="flex items-center gap-2 text-xs font-mono text-accent-green px-4 py-2 rounded-xl bg-accent-green/10 border border-accent-green/20 w-fit">
                <CheckCircle className="w-4 h-4" />
                Reflection sent to your inbox
              </div>
            ) : showEmailInput ? (
              <div className="flex gap-2 items-center">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={emailAddress}
                  onChange={e => setEmailAddress(e.target.value)}
                  className="flex-1 bg-surface border border-border rounded-xl px-4 py-2 text-xs font-mono focus:outline-none focus:border-accent"
                />
                <button
                  onClick={() => handleEmailReflection(emailAddress)}
                  disabled={emailSending || !emailAddress}
                  className="pill-button pill-button-primary px-4 py-2 text-xs disabled:opacity-40 flex items-center gap-1.5"
                >
                  {emailSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  Send
                </button>
                <button onClick={() => setShowEmailInput(false)} className="px-3 py-2 text-xs font-mono text-text-muted hover:text-text-primary">✕</button>
              </div>
            ) : (
              <button
                onClick={() => handleEmailReflection()}
                disabled={emailSending}
                className="flex items-center gap-2 text-xs font-mono text-text-muted hover:text-accent transition-colors px-3 py-2 rounded-xl hover:bg-surface border border-transparent hover:border-border w-fit"
              >
                <Mail className="w-3.5 h-3.5" />
                Email this to me
              </button>
            )}
          </div>
        </div>
      )}
      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
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
