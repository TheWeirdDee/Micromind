'use client';

import { useState } from 'react';
import { Copy, ExternalLink, Check, Share2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useMiniPay } from '@/hooks/useMiniPay';

interface ResponseCardProps {
  response: string;
  txHash?: string;
}

export function ResponseCard({ response, txHash }: ResponseCardProps) {
  const [copied, setCopied] = useState(false);
  const { shareToMiniPay } = useMiniPay();

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    const text = `Check out what I generated with @MicroMind_AI!\n\n"${response.slice(0, 100)}..."`;
    const url = 'https://micromind-three.vercel.app';
    shareToMiniPay(text, url);
  };

  return (
    <div className="mt-8 animate-fade-up" aria-live="polite" aria-label="AI response">
      <div className="bg-surface-2 border-l-2 border-accent-green p-6 rounded-r-2xl border-y border-r border-border">
        <div className="font-mono text-sm leading-relaxed text-text-primary prose prose-invert prose-sm max-w-none 
          prose-p:mb-4 prose-headings:mb-4 prose-headings:font-serif prose-li:list-disc prose-li:ml-4">
          <ReactMarkdown>{response}</ReactMarkdown>
        </div>
        
        <div className="mt-8 pt-6 border-t border-border/40 flex justify-between items-center gap-4">
          <div className="flex items-center gap-6">
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-accent-green" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy text</span>
                </>
              )}
            </button>

            <button 
              onClick={handleShare}
              className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-text-muted hover:text-accent transition-colors"
            >
              <Share2 className="w-3 h-3" />
              <span>Share on X</span>
            </button>
          </div>
          
          {txHash && (
            <a 
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors shrink-0"
            >
              <ExternalLink className="w-3 h-3" />
              <span>tx: {txHash.slice(0, 6)}...</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
