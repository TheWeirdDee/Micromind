'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, Brain, AlertTriangle, Loader2, RefreshCw, PenTool, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { updateStreak } from '@/lib/journal';
import { ConnectWalletModal } from '@/components/app/ConnectWalletModal';

export default function CoachPage() {
  const { address, isConnected, isMiniPay } = useWallet();
  const { payViaRelay, payAndGenerate, loading, step, error, reset, txHash } = usePayForPrompt();

  const [text, setText] = useState('');
  const [coachResponse, setCoachResponse] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [currentStep, setCurrentStep] = useState<'idle' | 'paying' | 'streaming' | 'complete'>('idle');

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Standard SSE streaming executor
  const startStreaming = async (txHash: string, promptText: string) => {
    const agentUrl = process.env.NEXT_PUBLIC_AGENT_API_URL;
    if (!agentUrl) return;

    setCurrentStep('streaming');
    setCoachResponse('');

    try {
      const response = await fetch(`${agentUrl}/api/coach`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: promptText, txHash }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) throw new Error('Response stream not readable');

      let buffer = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        
        // Keep the last partial line in buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6).trim();
            if (dataStr === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.text) {
                setCoachResponse(prev => prev + parsed.text);
              } else if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch {
              // skip parse issues
            }
          }
        }
      }

      setCurrentStep('complete');
      updateStreak(address);
    } catch (streamErr) {
      const err = streamErr as Error;
      console.error('[STREAM ERROR]', err);
      setCoachResponse(prev => prev + `\n\n[Coaching error: ${err.message}]`);
      setCurrentStep('complete');
    }
  };

  return (
    <div className="max-w-6xl mx-auto pb-24 px-4 pt-4 sm:pt-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/app" className="p-2 border border-border rounded-xl hover:bg-surface-2 transition-colors">
          <ChevronLeft className="w-4 h-4 text-text-muted" />
        </Link>
        <div>
          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Writing Assist</p>
          <h1 className="text-3xl font-serif mt-1">AI Writing Coach</h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Input box */}
        <div className="lg:col-span-6 space-y-4">
          <div className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            <label className="text-xs font-mono text-text-muted uppercase tracking-wider block">Draft Your Entry</label>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder="Start writing down your draft... (e.g., 'I felt so frustrated during the review today. I know I am going to get fired because of one mistake.')"
              className="w-full h-[260px] resize-none bg-surface-2 rounded-xl border border-border p-4 font-mono text-sm leading-relaxed text-text-primary outline-none focus:border-accent transition-colors"
            />
            
            <button
              onClick={async () => {
                // To keep it perfectly simple, we'll let usePayForPrompt run.
                // We'll write a useEffect to watch the txHash and trigger the stream!
                if (!isConnected || !address) {
                  setShowWalletModal(true);
                  return;
                }
                setCurrentStep('paying');
                if (isMiniPay) {
                  await payViaRelay(1, 'AI Coach', text.trim());
                } else {
                  await payAndGenerate(1, 'AI Coach', text.trim());
                }
              }}
              disabled={loading || !text.trim()}
              className="w-full py-3.5 bg-accent text-bg rounded-xl text-xs font-mono font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
            >
              <Brain className="w-4 h-4" />
              {loading ? 'Processing Payment...' : 'Get Coach Insights (0.005 USDm)'}
            </button>
          </div>
        </div>

        {/* Coach thoughts box */}
        <div className="lg:col-span-6">
          <div className="bg-surface border border-border rounded-2xl p-6 min-h-[380px] flex flex-col justify-between relative overflow-hidden">
            {/* Background design elements */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-accent/2 rounded-full filter blur-xl pointer-events-none" />

            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <Brain className="w-4 h-4 text-accent" />
                <span className="text-xs font-mono uppercase tracking-wider text-text-primary">Coach Feedback</span>
                {currentStep === 'streaming' && (
                  <span className="flex h-2 w-2 relative ml-auto">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                  </span>
                )}
              </div>

              <AnimatePresence mode="wait">
                {currentStep === 'idle' && !coachResponse && (
                  <motion.div
                    key="idle-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-48 flex flex-col items-center justify-center text-center p-4 space-y-2"
                  >
                    <PenTool className="w-8 h-8 text-text-muted/30" />
                    <p className="text-xs font-mono text-text-muted">Draft your thoughts on the left and click analyze to start your coaching session.</p>
                  </motion.div>
                )}

                {currentStep === 'paying' && (
                  <motion.div
                    key="paying-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="h-48 flex flex-col items-center justify-center text-center p-4 space-y-3"
                  >
                    <Loader2 className="w-8 h-8 text-accent animate-spin" />
                    <p className="text-xs font-mono text-text-primary font-bold">Waiting for Wallet Confirmation...</p>
                    <p className="text-[10px] font-mono text-text-muted">{step === 'approving' ? 'Approving USDm...' : 'Broadcasting transaction...'}</p>
                  </motion.div>
                )}

                {(currentStep === 'streaming' || coachResponse) && (
                  <motion.div
                    key="coaching-state"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs font-mono text-text-primary leading-relaxed space-y-3 whitespace-pre-line"
                  >
                    {coachResponse}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {currentStep === 'complete' && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 pt-4 border-t border-border flex items-center justify-between text-[10px] font-mono text-text-muted"
              >
                <div className="flex items-center gap-1.5 text-accent">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Session Complete</span>
                </div>
                <button
                  onClick={() => {
                    setCurrentStep('idle');
                    setCoachResponse('');
                    setText('');
                  }}
                  className="hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Reset Scribe
                </button>
              </motion.div>
            )}

            {error && (
              <div className="absolute inset-x-0 bottom-0 bg-red-950/20 border-t border-red-500/30 p-3 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-[10px] font-mono text-red-200 leading-normal">{error}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auto-trigger stream when payment goes through */}
      <StreamTrigger
        txHash={txHash}
        currentStep={currentStep}
        onStreamStart={(hash) => startStreaming(hash, text.trim())}
      />

      <ConnectWalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </div>
  );
}

// Side-effect component to watch usePayForPrompt's txHash and trigger stream
function StreamTrigger({
  txHash,
  currentStep,
  onStreamStart
}: {
  txHash: string | null;
  currentStep: string;
  onStreamStart: (hash: string) => void;
}) {
  const triggeredRef = useRef<string | null>(null);

  useEffect(() => {
    if (txHash && currentStep === 'paying' && triggeredRef.current !== txHash) {
      triggeredRef.current = txHash;
      onStreamStart(txHash);
    }
  }, [txHash, currentStep, onStreamStart]);

  return null;
}
