'use client';

import { useEffect, useState } from 'react';
import { History, ExternalLink, MessageSquare, FileText, X, User } from 'lucide-react';
import Link from 'next/link';
import { getHistory, type HistoryItem } from '@/lib/storage';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ICONS = {
  0: MessageSquare,
  1: FileText,
  2: X,
  3: User,
};

export default function HistoryPage() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const totalSpent = history.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toFixed(2);

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-serif tracking-tight">Your History</h2>
          <p className="text-text-muted font-mono text-sm mt-2">All your onchain thoughts.</p>
        </div>
      </header>

      <div className="bg-surface border border-border rounded-2xl p-6 flex justify-between items-center">
        <div>
          <p className="font-mono text-[10px] tracking-widest uppercase text-text-muted mb-1">Total Spent</p>
          <p className="text-2xl font-mono text-accent-green font-medium">{totalSpent} CELO</p>
        </div>
        <div className="text-right">
          <p className="font-mono text-[10px] tracking-widest uppercase text-text-muted mb-1">Total Prompts</p>
          <p className="text-2xl font-mono text-text-primary font-medium">{history.length}</p>
        </div>
      </div>

      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-border rounded-2xl">
            <History className="w-8 h-8 text-text-muted/20 mx-auto mb-4" />
            <p className="text-text-muted font-mono text-sm mb-6">No prompts yet.</p>
            <Link href="/app" className="pill-button pill-button-outline inline-flex">
              Start your first one
            </Link>
          </div>
        ) : (
          history.map((item) => {
            const Icon = ICONS[item.toolId as keyof typeof ICONS] || MessageSquare;
            const toolRoutes: Record<number, string> = {
              0: '/app/chat',
              1: '/app/resume',
              2: '/app/tweet',
              3: '/app/bio'
            };
            const route = toolRoutes[item.toolId as number] || '/app/chat';

            return (
              <Link 
                key={item.id} 
                href={`${route}?id=${item.txHash}`}
                className="bg-surface-2 border border-border rounded-2xl p-6 space-y-4 group hover:border-text-muted/40 transition-colors block"
              >
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface rounded-lg border border-border">
                      <Icon className="w-4 h-4 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-serif text-lg">{item.toolName}</h4>
                      <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                        {new Date(item.timestamp).toLocaleDateString()} · {item.cost}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                      View Response →
                    </span>
                    <a 
                      href={`https://celoscan.io/tx/${item.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 hover:bg-surface rounded-full transition-colors text-text-muted hover:text-text-primary"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
                <p className="text-sm font-mono text-text-muted line-clamp-2 px-2 italic">
                  "{item.prompt}"
                </p>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
