'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, Loader2, Mail, Sparkles, CheckCircle2, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';
import { AgentWarning } from '@/components/app/AgentWarning';
import { getHistory } from '@/lib/storage';
import { updateStreak } from '@/lib/journal';
import { ConnectWalletModal } from '@/components/app/ConnectWalletModal';

import { Suspense } from 'react';

function LetterPageInner() {
  const { isConnected, address, celoBalance } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState('');
  const [content, setContent] = useState('');
  const [freeSending, setFreeSending] = useState(false);
  const [freeSent, setFreeSent] = useState(false);
  const [polishedResponse, setPolishedResponse] = useState<string | null>(null);
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string }>(null);

  const { payAndGenerate, loading: paidLoading, step: paidStep } = usePayForPrompt();
  const searchParams = useSearchParams();

  const hasNoCelo = isConnected && Number(celoBalance) < 0.0005;
  const isFormValid = recipientEmail.includes('@') && senderName.trim().length > 0 && content.trim().length >= 20;

  useEffect(() => {
    const historyId = searchParams.get('id');
    if (historyId) {
      const history = getHistory();
      const item = history.find(h => h.txHash === historyId);
      if (item && item.toolId === 5) {
        setPolishedResponse(item.response);
        try {
          const parsed = JSON.parse(item.prompt);
          setContent(parsed.content || '');
          setRecipientEmail(parsed.recipientEmail || '');
          setSenderName(parsed.senderName || '');
        } catch {
          setContent(item.prompt);
        }
      }
    }
  }, [searchParams]);

  const handleFreeSend = async () => {
    if (!isFormValid || freeSending || paidLoading) return;
    setFreeSending(true);
    setFreeSent(false);

    try {
      const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
      const res = await fetch(`${agentUrl}/api/letter/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: content.trim(),
          recipientEmail: recipientEmail.trim(),
          senderName: senderName.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to send email');
      }

      setFreeSent(true);
      setContent('');
      setTimeout(() => setFreeSent(false), 5000);
    } catch (e: any) {
      console.error(e);
      alert(`Failed to send letter: ${e.message}`);
    } finally {
      setFreeSending(false);
    }
  };

  const handlePaidPolish = async () => {
    if (!isFormValid || freeSending || paidLoading) return;
    setPolishedResponse(null);

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      const payload = JSON.stringify({
        content: content.trim(),
        recipientEmail: recipientEmail.trim(),
        senderName: senderName.trim(),
      });

      setLastSubmission({ toolId: 5, toolName: 'Letter', prompt: payload });

      const aiResponse = await payAndGenerate(5, 'Letter', payload);
      if (aiResponse) {
        setPolishedResponse(aiResponse);
        updateStreak(address);
        setContent('');
      }
    } catch (err: any) {
      console.error(err);
      alert('Transaction failed. Make sure you have enough cUSD and CELO in your wallet.');
    }
  };

  const handleRetry = async () => {
    if (!lastSubmission || paidLoading) return;

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    try {
      const aiResponse = await payAndGenerate(lastSubmission.toolId, lastSubmission.toolName, lastSubmission.prompt);
      if (aiResponse) setPolishedResponse(aiResponse);
      setLastSubmission(null);
    } catch (e) {
      console.error('Retry failed', e);
      alert('Retry failed. Check your wallet and try again.');
    }
  };

  const getStepMessage = () => {
    switch (paidStep) {
      case 'checking': return 'Checking agent...';
      case 'submitting': return 'Preparing prompt...';
      case 'approving': return 'Approving cUSD spend...';
      case 'paying': return 'Sending payment...';
      case 'confirming': return 'Confirming on Celo...';
      case 'generating': return 'AI is polishing & sending...';
      case 'complete': return 'Sent!';
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
          <h2 className="text-2xl font-serif">Send a Letter</h2>
        </div>
        <span className="text-[10px] font-mono text-accent px-3 py-1 rounded-full bg-accent/10 border border-accent/20">
          Free + 0.01 cUSD
        </span>
      </header>

      {/* Celo Gas Warning */}
      {hasNoCelo && (
        <div className="p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-xs text-red-200 font-mono leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>You need a small amount of CELO for gas fees (~0.001 CELO per prompt). Get CELO via MiniPay or any Celo exchange before using AI tools.</span>
        </div>
      )}

      {paidStep === 'error' && (
        <div className="p-3 rounded-lg bg-red-900/40 border border-red-700 text-sm text-red-100 flex items-center justify-between font-mono text-xs">
          <div>Payment failed. You can retry submission.</div>
          <div className="flex gap-2">
            <button onClick={handleRetry} disabled={paidLoading} className="px-3 py-1 rounded bg-accent text-bg font-bold">Retry</button>
            <button onClick={() => setLastSubmission(null)} className="px-3 py-1 rounded border border-border">Dismiss</button>
          </div>
        </div>
      )}

      {/* Form Card */}
      <div className="bg-surface border border-border p-6 rounded-2xl relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
        
        <div className="space-y-6 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Recipient Email</label>
              <input
                type="email"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="friend@example.com"
                disabled={freeSending || paidLoading}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-accent outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Your Name</label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="Your Name"
                disabled={freeSending || paidLoading}
                className="w-full bg-surface-2 border border-border rounded-xl px-4 py-3 font-mono text-sm focus:border-accent outline-none transition-colors"
              />
            </div>
          </div>

          <div className="space-y-2 relative">
            <label className="font-mono text-[10px] uppercase text-text-muted tracking-widest px-2">Letter Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your letter here (minimum 20 characters)..."
              disabled={freeSending || paidLoading}
              className="w-full bg-surface-2 border border-border rounded-xl p-4 font-mono text-sm min-h-[180px] focus:border-accent outline-none transition-colors resize-none"
            />
            <span className="absolute bottom-3 right-3 font-mono text-[10px] text-text-muted/60">
              {content.length} chars
            </span>
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-2">
            <button
              onClick={handleFreeSend}
              disabled={!isFormValid || freeSending || paidLoading}
              className="pill-button border border-border bg-transparent hover:bg-surface-2 text-text-primary w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {freeSending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Send Letter (Free)</span>
                </>
              )}
            </button>

            <button
              onClick={handlePaidPolish}
              disabled={!isFormValid || freeSending || paidLoading || hasNoCelo}
              className="pill-button pill-button-primary w-full py-4 disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {paidLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="font-mono text-xs uppercase tracking-wider">{getStepMessage()}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>AI Polish & Send (0.01 cUSD)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Success Toasts & Responses */}
      <AnimatePresence>
        {freeSent && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-mono tracking-wide flex items-center gap-2 justify-center"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Letter sent successfully to {recipientEmail}!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {polishedResponse && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-accent-green/10 border border-accent-green/20 text-accent-green text-xs font-mono tracking-wide flex items-center gap-2 justify-center">
            <CheckCircle2 className="w-4 h-4" />
            <span>AI-Polished Letter sent successfully to {recipientEmail}!</span>
          </div>
          <h3 className="font-serif text-xl px-2">Polished Version Preview</h3>
          <ResponseCard response={polishedResponse} />
        </div>
      )}
      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </motion.div>
  );
}

export default function LetterPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading context...</div>}>
      <LetterPageInner />
    </Suspense>
  );
}
