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
    <div className="space-y-8 animate-fade-up pb-24">
      <div className="grid gap-8 lg:grid-cols-[2.2fr_1fr] items-start">
        <div className="space-y-8">
          <div className="space-y-4">
            <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Journal dashboard</p>
            <h2 className="text-4xl md:text-5xl font-serif tracking-tight">A calmer place for your daily writing.</h2>
            <p className="text-text-muted leading-relaxed max-w-none md:max-w-3xl">
              Capture your thoughts, keep your streak alive, and access your private writing tools in a cleaner, more mindful layout.
            </p>
          </div>

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
                  <p className="text-sm text-text-muted leading-relaxed">
                    Open your private journal to add a new entry, revisit old reflections, or simply write without judgment.
                  </p>
                </div>

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1 max-w-3xl">
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

          <section className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_12px_40px_rgba(0,0,0,0.16)]">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Recent activity</p>
                <h3 className="text-2xl md:text-3xl font-serif mt-2">Latest prompt & reflection</h3>
              </div>
              {recentPrompt && (
                <Link href="/app/history" className="inline-flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.35em] text-accent hover:text-accent-gold transition-colors">
                  View all
                  <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>

            <div className="mt-6 rounded-[2rem] border border-border bg-surface p-6">
              {recentPrompt ? (
                <Link href={`/app/history`}>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <h4 className="text-xl font-serif">{recentPrompt.toolName || 'Prompt'}</h4>
                        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mt-1">
                          {new Date(recentPrompt.timestamp).toLocaleDateString()} · {recentPrompt.cost}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm font-mono text-text-muted leading-relaxed italic">“{recentPrompt.prompt}”</p>
                  </div>
                </Link>
              ) : (
                <div className="text-center text-sm text-text-muted">No activity yet. Start journaling and your recent prompts will appear here.</div>
              )}
            </div>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {TOOLS.slice(0, 4).map((tool) => {
                const isReflectLocked = tool.slug === 'reflect' && entriesCount < 2;
                const isPatternLocked = tool.slug === 'pattern' && entriesCount < 5;
                const isLocked = isReflectLocked || isPatternLocked;
                const lockRequirement = isReflectLocked ? '2 entries required' : '5 entries required';

                return (
                  <Link key={tool.name} href={tool.route} className="block w-full min-w-0">
                    <div className="rounded-3xl border border-border bg-surface p-4 transition hover:border-accent/30 h-full">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <h4 className="font-serif text-base truncate">{tool.name}</h4>
                          <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted mt-1 leading-5">{isLocked ? lockRequirement : tool.description}</p>
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
            </div>
          </section>
        </div>

        <aside className="space-y-6 lg:max-w-[340px] xl:max-w-[360px]">
          <div className="rounded-[2rem] border border-border bg-surface-2 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
            <div className="mb-5">
              <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted">Today</p>
              <p className="text-2xl font-serif mt-2">{todayLabel}</p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

          <DailyStreak />
        </aside>
      </div>
    </div>
  );
}
