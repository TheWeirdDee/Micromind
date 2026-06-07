'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { History, ExternalLink, MessageSquare, BookOpen, Search, Mail, PenTool, Smile, Flame, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { getHistory, type HistoryItem } from '@/lib/storage';
import { getEntries, MOOD_ICONS, type JournalEntry } from '@/lib/journal';
import { useWallet } from '@/context/WalletContext';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ICONS = {
  1: MessageSquare,
  2: PenTool,
  3: BookOpen,
  4: Search,
  5: Mail,
};

function HistoryPageInner() {
  const { address } = useWallet();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<'journal' | 'prompts'>('journal');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [streakCount, setStreakCount] = useState(0);

  useEffect(() => {
    const hist = getHistory();
    const jEnts = getEntries();
    setHistory(hist);
    setEntries(jEnts);

    // Streak
    const streakKey = address ? `micromind_streak_data_${address}` : 'micromind_streak_data';
    const stored = localStorage.getItem(streakKey);
    if (stored) {
      try { setStreakCount(JSON.parse(stored).streakCount || 0); } catch {}
    }

    // URL param overrides auto-select
    const tabParam = searchParams.get('tab');
    if (tabParam === 'journal' || tabParam === 'prompts') {
      setActiveTab(tabParam);
    } else {
      const newestPromptTime = hist[0]?.timestamp || 0;
      const newestEntryTime = jEnts[0]?.timestamp || 0;
      setActiveTab(newestPromptTime > newestEntryTime ? 'prompts' : 'journal');
    }
  }, [address, searchParams]);

  const totalSpent = history.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toFixed(3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-24"
    >
      <header className="space-y-4">
        <div>
          <h2 className="text-4xl font-serif tracking-tight">Your History</h2>
          <p className="text-text-muted font-mono text-sm mt-2">All your thoughts and AI sessions.</p>
        </div>
        {/* Stats mini-bar */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted bg-surface border border-border px-3 py-1.5 rounded-full">
            <Flame className="w-3 h-3 text-accent-gold" />
            <span>{streakCount}d streak</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted bg-surface border border-border px-3 py-1.5 rounded-full">
            <BookOpen className="w-3 h-3 text-accent" />
            <span>{entries.length} journal entries</span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-text-muted bg-surface border border-border px-3 py-1.5 rounded-full">
            <Sparkles className="w-3 h-3 text-accent" />
            <span>{history.length} AI prompts · {totalSpent} cUSD</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('journal')}
          className={cn(
            "flex-1 py-3.5 text-center font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'journal'
              ? "border-accent text-accent font-bold"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          Journal Entries ({entries.length})
        </button>
        <button
          onClick={() => setActiveTab('prompts')}
          className={cn(
            "flex-1 py-3.5 text-center font-mono text-[10px] uppercase tracking-widest border-b-2 transition-all",
            activeTab === 'prompts'
              ? "border-accent text-accent font-bold"
              : "border-transparent text-text-muted hover:text-text-primary"
          )}
        >
          AI Prompts ({history.length})
        </button>
      </div>

      {activeTab === 'journal' ? (
        <div className="space-y-4">
          {entries.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-surface/30">
              <BookOpen className="w-8 h-8 text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-muted font-mono text-sm mb-6">Your journal is empty.</p>
              <Link href="/app/journal" className="pill-button pill-button-outline inline-flex text-xs font-mono tracking-wider">
                Write your first entry
              </Link>
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="bg-surface border border-border rounded-2xl p-5 space-y-3"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = MOOD_ICONS[entry.mood] || Smile;
                      return <Icon className="w-4 h-4 text-accent" />;
                    })()}
                    <span className="text-xs font-mono text-text-muted">{entry.date}</span>
                  </div>
                  <Link href="/app/journal" className="text-[10px] font-mono text-accent hover:underline uppercase tracking-wider">
                    Edit Entry ↗
                  </Link>
                </div>
                <p className="font-mono text-sm leading-relaxed text-text-primary whitespace-pre-wrap">
                  {entry.content}
                </p>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {history.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-surface/30">
              <History className="w-8 h-8 text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-muted font-mono text-sm mb-6">No paid prompts yet.</p>
              <Link href="/app" className="pill-button pill-button-outline inline-flex text-xs font-mono tracking-wider">
                Start a session
              </Link>
            </div>
          ) : (
            history.map((item) => {
              const Icon = ICONS[item.toolId as keyof typeof ICONS] || MessageSquare;
              const toolRoutes: Record<number, string> = {
                1: '/app/chat',
                2: '/app/tweet',
                3: '/app/reflect',
                4: '/app/pattern',
                5: '/app/letter'
              };
              const route = toolRoutes[item.toolId as number] || '/app/chat';
              const fullRoute = `${route}?id=${item.txHash}`;

              let displayPrompt = item.prompt;
              if (item.toolId === 5) {
                try {
                  const parsed = JSON.parse(item.prompt);
                  displayPrompt = parsed.content || item.prompt;
                } catch {}
              }

              return (
                <div
                  key={item.id}
                  onClick={() => window.location.href = fullRoute}
                  className="bg-surface-2 border border-border rounded-2xl p-6 space-y-4 group hover:border-text-muted/40 transition-colors block cursor-pointer"
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
                        className="p-2 hover:bg-surface rounded-full transition-colors text-text-muted hover:text-text-primary relative z-10"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-text-muted line-clamp-2 px-2 italic">
                    "{displayPrompt}"
                  </p>
                </div>
              );
            })
          )}
        </div>
      )}
    </motion.div>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center animate-pulse font-mono text-accent uppercase tracking-widest text-xs">
        Loading history...
      </div>
    }>
      <HistoryPageInner />
    </Suspense>
  );
}
