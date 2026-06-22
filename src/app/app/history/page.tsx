'use client';

import { useEffect, useState, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { History, ExternalLink, MessageSquare, BookOpen, Search, Mail, PenTool, Smile, Laugh, Meh, Angry, Frown, Flame, Sparkles, ArrowUpRight, ArrowRight, Copy, Check } from 'lucide-react';
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

const MOODS = [
  { mood: 'happy',   icon: Smile,  label: 'Happy'   },
  { mood: 'excited', icon: Laugh,  label: 'Excited' },
  { mood: 'neutral', icon: Meh,    label: 'Neutral' },
  { mood: 'angry',   icon: Angry,  label: 'Angry'   },
  { mood: 'sad',     icon: Frown,  label: 'Sad'     },
];

function HistoryPageInner() {
  const { address } = useWallet();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [history, setHistory] = useState<HistoryItem[]>(() => getHistory());
  const [entries, setEntries] = useState<JournalEntry[]>(() => getEntries());
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [moodFilter, setMoodFilter] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<'journal' | 'prompts'>(() => {
    if (tabParam === 'journal' || tabParam === 'prompts') return tabParam;
    const hist = getHistory();
    const jEnts = getEntries();
    return (hist[0]?.timestamp || 0) > (jEnts[0]?.timestamp || 0) ? 'prompts' : 'journal';
  });

  const streakCount = useMemo(() => {
    if (typeof window === 'undefined') return 0;
    const key = address ? `micromind_streak_data_${address}` : 'micromind_streak_data';
    try { return JSON.parse(localStorage.getItem(key) ?? '{}').streakCount || 0; } catch { return 0; }
  }, [address]);

  useEffect(() => {
    const refresh = () => { setHistory(getHistory()); setEntries(getEntries()); };
    window.addEventListener('journal_updated', refresh);
    return () => window.removeEventListener('journal_updated', refresh);
  }, []);

  const totalSpent = history.reduce((acc, curr) => acc + parseFloat(curr.cost), 0).toFixed(3);

  const filteredEntries = entries.filter(e => {
    if (moodFilter && e.mood !== moodFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!e.content.toLowerCase().includes(q) && !e.date.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const copyTxHash = (hash: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash).catch(() => {});
    setCopiedHash(hash);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const filteredHistory = history.filter(h => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!h.prompt.toLowerCase().includes(q) && !h.toolName.toLowerCase().includes(q)) return false;
    }
    return true;
  });

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

      {/* Filters */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'journal' ? "Search entries by content or date..." : "Search prompts..."}
            className="w-full bg-surface-2 border border-border rounded-xl px-11 py-3 text-sm font-mono focus:border-accent outline-none transition-colors"
          />
        </div>

        {activeTab === 'journal' && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <button
              onClick={() => setMoodFilter(null)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-mono whitespace-nowrap border shrink-0 transition-all",
                moodFilter === null
                  ? "bg-surface-2 text-text-primary border-border"
                  : "border-transparent text-text-muted hover:bg-surface/50 hover:text-text-primary"
              )}
            >
              All
            </button>
            {MOODS.map(m => {
              const isActive = moodFilter === m.mood;
              return (
                <button
                  key={m.mood}
                  onClick={() => setMoodFilter(isActive ? null : m.mood)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-mono whitespace-nowrap border shrink-0 transition-all",
                    isActive
                      ? "bg-accent/10 border-accent/30 text-accent"
                      : "border-border text-text-muted hover:bg-surface-2"
                  )}
                >
                  <m.icon className="w-3 h-3" /> {m.label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {activeTab === 'journal' ? (
        <div className="space-y-4">
          {filteredEntries.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-surface/30">
              <BookOpen className="w-8 h-8 text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-muted font-mono text-sm mb-6">Your journal is empty.</p>
              <Link href="/app/journal" className="pill-button pill-button-outline inline-flex text-xs font-mono tracking-wider">
                Write your first entry
              </Link>
            </div>
          ) : (
            filteredEntries.map((entry) => (
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
                    <span className="inline-flex items-center gap-1">Edit Entry <ArrowUpRight className="w-3 h-3" /></span>
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
          {filteredHistory.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-border rounded-2xl bg-surface/30">
              <History className="w-8 h-8 text-text-muted/20 mx-auto mb-4" />
              <p className="text-text-muted font-mono text-sm mb-6">No paid prompts yet.</p>
              <Link href="/app" className="pill-button pill-button-outline inline-flex text-xs font-mono tracking-wider">
                Start a session
              </Link>
            </div>
          ) : (
            filteredHistory.map((item) => {
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
                        <span className="inline-flex items-center gap-1">View Response <ArrowRight className="w-3 h-3" /></span>
                      </span>
                      <button
                        onClick={(e) => copyTxHash(item.txHash, e)}
                        className="p-2 hover:bg-surface rounded-full transition-colors text-text-muted hover:text-text-primary relative z-10"
                        title="Copy transaction hash"
                      >
                        {copiedHash === item.txHash ? <Check className="w-4 h-4 text-accent-green" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={`https://celoscan.io/tx/${item.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 px-2 py-1 hover:bg-surface rounded-lg transition-colors text-text-muted hover:text-accent relative z-10 font-mono text-[10px]"
                        title="View on Celoscan"
                      >
                        {item.txHash.slice(0, 6)}…{item.txHash.slice(-4)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-text-muted line-clamp-2 px-2 italic">
                    &ldquo;{displayPrompt}&rdquo;
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
