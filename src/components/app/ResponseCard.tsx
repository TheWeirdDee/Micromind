'use client';

import { Copy, ExternalLink, Check } from 'lucide-react';
import { useState } from 'react';

interface ResponseCardProps {
  response: string;
  txHash?: string;
}

export function ResponseCard({ response, txHash }: ResponseCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(response);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-8 animate-fade-up">
      <div className="bg-surface-2 border-l-2 border-accent-green p-6 rounded-r-2xl border-y border-r border-border">
        <p className="font-mono text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
          {response}
        </p>
        
        <div className="mt-8 pt-6 border-t border-border/40 flex justify-between items-center">
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
          
          {txHash && (
            <a 
              href={`https://celoscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase text-text-muted hover:text-text-primary transition-colors"
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
