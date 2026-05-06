'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User as UserIcon, Loader2, History as HistoryIcon } from 'lucide-react';
import Link from 'next/link';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { TOOLS } from '@/constants/tools';
import { saveToHistory } from '@/lib/storage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

import { AgentWarning } from '@/components/app/AgentWarning';

export default function ChatPage() {
  const [prompt, setPrompt] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [txHash, setTxHash] = useState<string | null>(null);
  const { payAndGenerate, loading, step } = usePayForPrompt();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    const userPrompt = prompt;
    setPrompt('');
    setMessages(prev => [...prev, { role: 'user', content: userPrompt }]);

    try {
      const aiResponse = await payAndGenerate(TOOLS.CHAT.id, TOOLS.CHAT.name, userPrompt);
      if (aiResponse) {
        setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Error: Connection failed or payment rejected. Ensure you are in MiniPay with enough cUSD.' 
      }]);
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'SUBMITTING': return 'Preparing prompt...';
      case 'APPROVING': return 'Approve cUSD in MiniPay...';
      case 'PAYING': return 'Sending payment...';
      case 'POLLING': return 'AI is thinking...';
      case 'COMPLETE': return 'Generation complete!';
      default: return 'Processing...';
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-180px)]">
      <AgentWarning />
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-serif">AI Chat</h1>
          <p className="text-text-muted font-mono text-xs uppercase tracking-widest mt-1">
            {TOOLS.CHAT.price} per prompt
          </p>
        </div>
        <Link 
          href="/app/history" 
          className="p-2 rounded-full border border-border hover:bg-surface transition-colors"
        >
          <HistoryIcon className="w-5 h-5 text-text-muted" />
        </Link>
      </div>

      {/* Messages Area */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-6 mb-6 pr-2 scrollbar-hide"
      >
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
                  {msg.content}
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

      {/* Input Area */}
      <form 
        onSubmit={handleSubmit}
        className="relative"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type your message..."
          disabled={loading}
          className="w-full bg-surface border border-border rounded-2xl px-6 py-4 pr-16 text-sm focus:outline-none focus:border-accent transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!prompt.trim() || loading}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-accent text-bg flex items-center justify-center hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-accent"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Send className="w-5 h-5" />
          )}
        </button>
      </form>
    </div>
  );
}
