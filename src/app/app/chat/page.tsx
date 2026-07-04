'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User as UserIcon, Loader2, History as HistoryIcon, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useSearchParams } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { getHistory } from '@/lib/storage';
import { useWallet } from '@/context/WalletContext';
import { updateStreak } from '@/lib/journal';
import dynamic from 'next/dynamic';
import { AgentWarning } from '@/components/app/AgentWarning';
import { Suspense } from 'react';

const ConnectWalletModal = dynamic(
  () => import('@/components/app/ConnectWalletModal').then((m) => m.ConnectWalletModal),
  { ssr: false }
);

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function ChatPageInner({ historyId }: { historyId: string | null }) {
  const { isConnected, address, celoBalance, isMiniPay } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>(() => {
    if (historyId) {
      const item = getHistory().find(h => h.txHash === historyId);
      if (item && item.toolId === 1) {
        return [
          { role: 'user', content: item.prompt },
          { role: 'assistant', content: item.response },
        ];
      }
      return [];
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('micromind_chat_memory');
      if (saved) { try { return JSON.parse(saved); } catch { /* ignore */ } }
    }
    return [];
  });
  const [lastSubmission, setLastSubmission] = useState<null | { toolId: number; toolName: string; prompt: string; chatHistory?: Message[] }>(null);
  const { payAndGenerate, payViaRelay, loading, step, error, reset } = usePayForPrompt();
  const scrollRef = useRef<HTMLDivElement>(null);

  const hasNoCelo = isConnected && !isMiniPay && Number(celoBalance) < 0.0005;

  // Persist messages
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem('micromind_chat_memory', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    const userPrompt = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);

    // Send the last 5 messages as context for memory
    const historyContext: Message[] = [
      ...messages.slice(-5),
      { role: 'user', content: userPrompt }
    ];
    setLastSubmission({ toolId: 1, toolName: 'Chat', prompt: userPrompt, chatHistory: historyContext });
    // MiniPay relay path: sends just the current prompt (chat history not supported in typed data)
    const aiResponse = isMiniPay
      ? await payViaRelay(1, 'Chat', userPrompt)
      : await payAndGenerate(1, 'Chat', userPrompt, historyContext);
    if (aiResponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      updateStreak(address);
    }
  };

  const handleRetry = async () => {
    if (!lastSubmission || loading) return;

    if (!isConnected || !address) {
      setShowWalletModal(true);
      return;
    }

    setMessages(prev => [...prev, { role: 'user', content: lastSubmission.prompt }]);
    const aiResponse = isMiniPay
      ? await payViaRelay(lastSubmission.toolId, lastSubmission.toolName, lastSubmission.prompt)
      : await payAndGenerate(lastSubmission.toolId, lastSubmission.toolName, lastSubmission.prompt, lastSubmission.chatHistory);
    if (aiResponse) {
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
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
      className="flex flex-col h-[calc(100vh-180px)] max-w-2xl mx-auto w-full"
    >
      <AgentWarning />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif">AI Chat</h1>
          <p className="text-text-muted font-mono text-xs uppercase tracking-widest mt-1">
            0.005 USDm per prompt
          </p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              if (confirm('Clear entire chat history?')) {
                setMessages([]);
                localStorage.removeItem('micromind_chat_memory');
              }
            }}
            className="p-2 rounded-full border border-border hover:bg-surface text-text-muted hover:text-red-400 transition-colors"
            title="Clear Chat"
          >
            <X className="w-5 h-5" />
          </button>
          <Link 
            href="/app/history" 
            className="p-2 rounded-full border border-border hover:bg-surface transition-colors"
          >
            <HistoryIcon className="w-5 h-5 text-text-muted" />
          </Link>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 scrollbar-hide"
      >
        {step === 'error' && (
          <div className="mb-4 p-3 rounded-lg bg-red-900/40 border border-red-700 text-xs text-red-100 flex items-center justify-between font-mono">
            <div>{error || 'Payment failed. You can retry.'}</div>
            <div className="flex gap-2 ml-3 shrink-0">
              <button onClick={handleRetry} disabled={loading} className="px-3 py-1 rounded bg-accent text-bg font-bold">Retry</button>
              <button onClick={() => { setLastSubmission(null); reset(); }} className="px-3 py-1 rounded border border-border">Dismiss</button>
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="h-full flex flex-col items-center justify-center text-center px-8"
            >
              <div className="w-12 h-12 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-accent" />
              </div>
              <h3 className="text-lg font-serif mb-2">How can I help today?</h3>
              <p className="text-text-muted text-sm font-mono max-w-[240px]">
                Ask me anything. Every response is powered by Llama-3.3.
              </p>
            </motion.div>
          ) : (
            messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-4 max-w-[85%]",
                  msg.role === 'user' ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0 border",
                  msg.role === 'assistant' ? "bg-accent border-accent" : "bg-surface border-border"
                )}>
                  {msg.role === 'assistant' ? (
                    <Bot className="w-4 h-4 text-bg" />
                  ) : (
                    <UserIcon className="w-4 h-4 text-text-muted" />
                  )}
                </div>
                <div className={cn(
                  "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === 'assistant' 
                    ? "bg-surface border border-border text-text-primary" 
                    : "bg-accent/10 border border-accent/20 text-text-primary"
                )}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </motion.div>
            ))
          )}
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-accent border border-accent flex items-center justify-center shrink-0">
                <Loader2 className="w-4 h-4 text-bg animate-spin" />
              </div>
              <div className="bg-surface border border-border px-4 py-3 rounded-2xl text-xs font-mono text-accent animate-pulse uppercase tracking-widest">
                {getStepMessage()}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {hasNoCelo && (
        <div className="mb-4 p-4 rounded-xl bg-red-950/30 border border-red-900/60 text-xs text-red-200 font-mono leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
          <span>You need a small amount of CELO for gas fees (~0.001 CELO per prompt). Get CELO via MiniPay or any Celo exchange before using AI tools.</span>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="relative"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
          placeholder={hasNoCelo ? "Please get CELO to chat..." : "Type your message..."}
          disabled={loading || hasNoCelo}
          maxLength={500}
          className="w-full bg-surface border border-border rounded-2xl px-6 py-4 pr-16 text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading || hasNoCelo}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-accent text-bg flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-accent"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
      <div className="flex justify-end mt-1 pr-1">
        <span className={`text-[10px] font-mono ${
          prompt.length >= 480 ? 'text-red-400' : 'text-text-muted'
        }`}>
          {prompt.length}/500
        </span>
      </div>
      <ConnectWalletModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
    </motion.div>
  );
}

function ChatPageLoader() {
  const searchParams = useSearchParams();
  const historyId = searchParams.get('id');
  return <ChatPageInner key={historyId ?? 'new'} historyId={historyId} />;
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest">Loading context...</div>}>
      <ChatPageLoader />
    </Suspense>
  );
}
