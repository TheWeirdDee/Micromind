'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, BookOpen, Lock, Bird, Sparkles, Search, Mail, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';

import { TOOLS } from '@/constants/tools';
import { DailyStreak } from '@/components/app/DailyStreak';
import { MoodChart } from '@/components/app/MoodChart';
import { WordCloud } from '@/components/app/WordCloud';
import { getHistory, type HistoryItem } from '@/lib/storage';
import { getEntries, getLastEntry, type JournalEntry } from '@/lib/journal';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 14 } },
} as const;

const TOOL_ICONS: Record<string, any> = {
  chat: MessageSquare,
  tweet: Bird,
  reflect: Sparkles,
  pattern: Search,
  letter: Mail,
};

export default function AppHome() {
  const { address } = useWallet();
  const [recentPrompt, setRecentPrompt] = useState<HistoryItem | null>(null);
  const [entriesCount, setEntriesCount] = useState(0);
  const [lastEntry, setLastEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const entries = getEntries();
      setEntriesCount(entries.length);
      setLastEntry(getLastEntry());
      const hist = getHistory();
      if (hist && hist.length > 0) setRecentPrompt(hist[0]);
    }
  }, []);

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      <div className="grid gap-6 lg:grid-cols-[2.2fr_1fr] items-start">
        <div className="space-y-6">

          {/* Journal card */}
          <motion.div variants={itemVariants}>
            <Link href="/app/journal">
              <motion.div
                whileTap={{ scale: 0.99 }}
                className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-accent/10 to-surface p-7 shadow-[0_20px_60px_rgba(0,0,0,0.2)] group"
              >
                <div className="absolute inset-0 halftone-bg opacity-6 pointer-events-none" />
                <div className="relative z-10 flex items-center justify-between gap-6">
                  <div className="space-y-3 min-w-0">
                    <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Core journal</span>
                    <h3 className="text-2xl font-serif tracking-tight group-hover:text-accent transition-colors">
                      {lastEntry ? 'Continue your journal' : 'Start your journal'}
                    </h3>
                    <p className="font-mono text-sm text-text-muted leading-relaxed line-clamp-2">
                      {lastEntry?.content
                        ? lastEntry.content.slice(0, 100) + (lastEntry.content.length > 100 ? '…' : '')
                        : 'Your first entry is waiting.'}
                    </p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-accent text-bg shadow-lg shadow-accent/20 shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Tools */}
          <motion.section variants={itemVariants} className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">AI Tools</p>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
              {TOOLS.map((tool) => {
                const isReflectLocked = tool.slug === 'reflect' && entriesCount < 2;
                const isPatternLocked = tool.slug === 'pattern' && entriesCount < 5;
                const isLocked = isReflectLocked || isPatternLocked;
                const lockLabel = isReflectLocked ? '2 entries' : '5 entries';
                const Icon = TOOL_ICONS[tool.slug] || HelpCircle;

                const card = (
                  <div className={`rounded-2xl border border-border bg-surface p-4 h-full flex flex-col justify-between transition ${
                    isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:border-accent/30 cursor-pointer'
                  }`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h4 className="font-serif text-base">{tool.name}</h4>
                        <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">
                          {isLocked ? `Requires ${lockLabel}` : tool.description}
                        </p>
                      </div>
                      <div className="rounded-xl bg-bg/80 p-2.5 shrink-0">
                        {isLocked
                          ? <Lock className="w-4 h-4 text-text-muted" />
                          : <Icon className="w-4 h-4 text-accent" />
                        }
                      </div>
                    </div>
                  </div>
                );

                return isLocked
                  ? <div key={tool.name}>{card}</div>
                  : <Link key={tool.name} href={tool.route}>{card}</Link>;
              })}
            </div>
          </motion.section>

          {/* Recent activity */}
          {recentPrompt && (
            <motion.section variants={itemVariants} className="rounded-[2rem] border border-border bg-surface-2 p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Recent activity</p>
                <Link href="/app/history" className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-accent hover:text-accent-gold transition-colors">
                  View all <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <Link href="/app/history">
                <div className="rounded-2xl border border-border bg-surface p-4 space-y-2 hover:border-accent/30 transition-colors">
                  <div className="flex items-center justify-between">
                    <h4 className="font-serif text-base">{recentPrompt.toolName || 'Prompt'}</h4>
                    <span className="font-mono text-[10px] text-text-muted">{recentPrompt.cost}</span>
                  </div>
                  <p className="text-sm font-mono text-text-muted leading-relaxed italic line-clamp-2">"{recentPrompt.prompt}"</p>
                </div>
              </Link>
            </motion.section>
          )}
        </div>

        {/* Sidebar */}
        <motion.aside variants={itemVariants} className="space-y-5 lg:max-w-[340px] xl:max-w-[360px]">
          <div className="rounded-[2rem] border border-border bg-surface-2 p-5">
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Today</p>
            <p className="text-xl font-serif mt-1.5">{todayLabel}</p>
            <div className="grid grid-cols-2 gap-3 mt-4">
              <div className="rounded-2xl bg-bg/60 border border-border p-3.5">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Entries</p>
                <p className="text-2xl font-serif mt-1">{entriesCount}</p>
              </div>
              <div className="rounded-2xl bg-bg/60 border border-border p-3.5">
                <p className="text-[10px] uppercase tracking-widest text-text-muted">Last saved</p>
                <p className="mt-1 font-mono text-xs text-text-primary">{lastEntry?.date ?? '—'}</p>
              </div>
            </div>
          </div>

          <DailyStreak />
          <MoodChart />
          <WordCloud />
        </motion.aside>
      </div>
    </motion.div>
  );
}
