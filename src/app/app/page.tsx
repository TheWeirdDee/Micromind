'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Loader2, BookOpen, Lock, Bird, Sparkles, Search, Mail, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';

import { TOOLS } from '@/constants/tools';
import { DailyStreak } from '@/components/app/DailyStreak';
import { getHistory, type HistoryItem } from '@/lib/storage';
import { getEntries, getLastEntry, type JournalEntry } from '@/lib/journal';

export default function AppHome() {
  const { isConnected, address, isMiniPay, connect } = useWallet();
  const [appUrl, setAppUrl] = useState('');
  const [recentPrompt, setRecentPrompt] = useState<HistoryItem | null>(null);
  const [entriesCount, setEntriesCount] = useState(0);
  const [lastEntry, setLastEntry] = useState<JournalEntry | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = process.env.NEXT_PUBLIC_APP_URL || (window.location.origin + '/app');
      setAppUrl(url);
      
      if (!process.env.NEXT_PUBLIC_APP_URL) {
        console.warn(
          'NEXT_PUBLIC_APP_URL not set. ' +
          'QR code will use localhost. ' +
          'Add this in Vercel dashboard after deploying.'
        );
      }
      
      const entries = getEntries();
      setEntriesCount(entries.length);
      setLastEntry(getLastEntry());
      
      const hist = getHistory();
      if (hist && hist.length > 0) {
        setRecentPrompt(hist[0]);
      }
    }
  }, []);

  // Only show app content when connected
  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="space-y-10 animate-fade-up pb-24">
      <header className="grid gap-6 xl:grid-cols-[1.8fr_auto] items-start">
        <div className="space-y-4 max-w-3xl">
          <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Journal dashboard</p>
          <h2 className="text-5xl font-serif tracking-tight">A calmer place for your daily writing.</h2>
          <p className="max-w-2xl text-text-muted leading-relaxed">
            Capture your thoughts, keep your streak alive, and access your private writing tools in a cleaner, more mindful layout.
          </p>
        </div>

        <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_30px_80px_rgba(0,0,0,0.28)]">
          <div className="mb-5">
            <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Today</p>
            <p className="text-2xl font-serif mt-2">{todayLabel}</p>
          </div>

          <div className="grid gap-3">
            <div className="rounded-3xl bg-bg/60 border border-border p-4">
              <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Entries</p>
              <p className="text-3xl font-serif mt-2">{entriesCount}</p>
            </div>
            <div className="rounded-3xl bg-bg/60 border border-border p-4">
              <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Last saved</p>
              <p className="mt-2 font-mono text-sm text-text-primary">{lastEntry?.date ?? 'No entry yet'}</p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.9fr_1fr]">
        <Link href="/app/journal">
          <motion.div
            whileTap={{ scale: 0.99 }}
            className="relative overflow-hidden rounded-[2rem] border border-border bg-gradient-to-br from-accent/10 to-surface p-8 shadow-[0_24px_70px_rgba(0,0,0,0.25)] group"
          >
            <div className="absolute inset-0 halftone-bg opacity-6 pointer-events-none" />
            <div className="relative z-10 flex flex-col gap-6">
              <div className="space-y-3">
                <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Core journal</span>
                <h3 className="text-3xl font-serif tracking-tight group-hover:text-accent transition-colors">Continue your journal</h3>
                <p className="max-w-xl text-sm text-text-muted leading-relaxed">
                  Open your private journal to add a new entry, revisit old reflections, or simply write without judgment.
                </p>
              </div>

              <div className="flex items-center justify-between gap-6">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Recent entry</p>
                  <p className="font-mono text-sm text-text-primary leading-relaxed">
                    {lastEntry?.content ? `${lastEntry.content.slice(0, 115)}${lastEntry.content.length > 115 ? '…' : ''}` : 'No entry yet. Start with your first thought today.'}
                  </p>
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent text-bg shadow-lg shadow-accent/20">
                  <BookOpen className="w-6 h-6" />
                </div>
              </div>
            </div>
          </motion.div>
        </Link>

        <div className="space-y-6">
          <DailyStreak />

          <div className="bg-surface border border-border p-6 rounded-[2rem] shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Writing tools</p>
                <h3 className="text-xl font-serif mt-2">Private journal companions</h3>
              </div>
              <span className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Local-first</span>
            </div>

            <motion.div
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              initial="hidden"
              animate="show"
              className="grid gap-4"
            >
              {TOOLS.slice(0, 4).map((tool) => {
                const isReflectLocked = tool.slug === 'reflect' && entriesCount < 2;
                const isPatternLocked = tool.slug === 'pattern' && entriesCount < 5;
                const isLocked = isReflectLocked || isPatternLocked;
                const lockRequirement = isReflectLocked ? '2 entries required' : '5 entries required';

                return (
                  <Link key={tool.name} href={tool.route} className="block">
                    <div className="rounded-3xl border border-border bg-surface-2 p-4 transition hover:border-accent/30">
                      <div className="flex items-center justify-between gap-4 mb-3">
                        <div>
                          <h4 className="font-serif text-base">{tool.name}</h4>
                          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted mt-1">{isLocked ? lockRequirement : tool.description}</p>
                        </div>
                        <div className="rounded-2xl bg-bg/90 p-3">
                          {(() => {
                            const TOOL_ICONS: Record<string, any> = {
                              chat: MessageSquare,
                              tweet: Bird,
                              reflect: Sparkles,
                              pattern: Search,
                              letter: Mail,
                            };
                            const Icon = TOOL_ICONS[tool.slug] || HelpCircle;
                            return <Icon className="w-5 h-5 text-accent" />;
                          })()}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </motion.div>
          </div>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Recent activity</p>
            <h3 className="text-3xl font-serif mt-2">Latest prompt & reflection</h3>
          </div>
          {recentPrompt && (
            <Link href="/app/history" className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.35em] text-accent hover:text-accent-gold transition-colors">
              View all
              <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        <div className="space-y-3">
          {recentPrompt ? (
            <Link href={`/app/history`}>
              <div className="rounded-[2rem] border border-border bg-surface-2 p-6 transition hover:border-accent/30">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-serif">{recentPrompt.toolName || 'Prompt'}</h4>
                      <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mt-1">
                        {new Date(recentPrompt.timestamp).toLocaleDateString()} · {recentPrompt.cost}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-mono text-text-muted leading-relaxed italic">“{recentPrompt.prompt}”</p>
                </div>
              </div>
            </Link>
          ) : (
            <div className="rounded-[2rem] border border-dashed border-border bg-surface-2 p-6 text-center text-sm text-text-muted">
              No activity yet. Start journaling and your recent prompts will appear here.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
