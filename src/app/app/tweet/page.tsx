'use client';

import { useState } from 'react';
import { ChevronLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/constants/tools';
import { usePayForPrompt } from '@/hooks/usePayForPrompt';
import { ResponseCard } from '@/components/app/ResponseCard';

export default function TweetPage() {
  const [topic, setTopic] = useState('');
  const [response, setResponse] = useState<string | null>(null);
  const { payAndGenerate, loading, step } = usePayForPrompt();

  const handleGenerate = async () => {
    try {
      const aiResponse = await payAndGenerate(TOOLS.TWEET.id, TOOLS.TWEET.name, topic);
      if (aiResponse) {
        setResponse(aiResponse);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const getStepMessage = () => {
    switch (step) {
      case 'SUBMITTING': return 'Preparing tweet idea...';
      case 'APPROVING': return 'Approve cUSD in MiniPay...';
      case 'PAYING': return 'Sending payment...';
      case 'POLLING': return 'AI is crafting your tweet...';
      case 'COMPLETE': return 'Tweet ready!';
      default: return 'Processing...';
    }
  };

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Link href="/app" className="p-2 hover:bg-surface-2 rounded-full transition-colors">
            <ChevronLeft className="w-5 h-5 text-text-muted" />
          </Link>
          <h2 className="text-2xl font-serif">Tweet Gen</h2>
        </div>
        <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
          {TOOLS.TWEET.price} cUSD
        </span>
      </header>

      <div className="space-y-4">
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
    </div>
  );
}
