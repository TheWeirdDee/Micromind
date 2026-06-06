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
  return (
    <div className="space-y-8 animate-fade-up pb-24">
      <header>
        <h2 className="text-4xl font-serif mb-2 tracking-tight">
          My Mind Dashboard
        </h2>
        <p className="text-text-muted font-mono text-sm">Reflect, capture patterns, write letters, and chat.</p>
      </header>

      <DailyStreak />

      {/* Prominent Journal Card */}
      <Link href="/app/journal">
        <motion.div
          whileTap={{ scale: 0.99 }}
          className="bg-gradient-to-br from-accent/10 to-surface border border-accent/20 p-6 rounded-3xl flex justify-between items-center group hover:border-accent transition-colors relative overflow-hidden"
        >
          <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
          <div className="space-y-2 relative z-10">
            <span className="text-[10px] font-mono text-accent uppercase tracking-widest font-bold">Core Experience</span>
            <h3 className="font-serif text-2xl group-hover:text-accent transition-colors">Continue Writing →</h3>
            <p className="font-mono text-xs text-text-muted">
              {entriesCount > 0 
                ? `${entriesCount} entries · Last entry: ${lastEntry?.date || ''}` 
                : 'No entries yet · Start your private journal'}
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-accent text-bg shadow-lg shadow-accent/10 relative z-10">
            <BookOpen className="w-6 h-6" />
          </div>
        </motion.div>
      </Link>
      
      <div className="space-y-4">
        <h4 className="font-mono text-[10px] tracking-widest uppercase text-text-muted px-2">AI Assistants</h4>
        <motion.div 
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: { staggerChildren: 0.05 }
            }
          }}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4"
        >
          {TOOLS.map((tool) => {
            const isReflectLocked = tool.slug === 'reflect' && entriesCount < 2;
            const isPatternLocked = tool.slug === 'pattern' && entriesCount < 5;
            const isLocked = isReflectLocked || isPatternLocked;
            const lockRequirement = isReflectLocked ? 'Needs 2+ entries' : 'Needs 5+ entries';

            return (
              <Link key={tool.name} href={tool.route}>
                <motion.div
                  variants={{
                    hidden: { opacity: 0, y: 15 },
                    show: { opacity: 1, y: 0 }
                  }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-surface border border-border p-5 rounded-2xl flex flex-col gap-4 group hover:border-text-muted transition-colors relative h-full justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2.5 rounded-xl w-fit border border-border bg-surface-2 group-hover:border-accent-gold/40 transition-colors">
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
                      {isLocked && (
                        <span className="flex items-center gap-1 font-mono text-[8px] text-accent-gold bg-accent-gold/10 border border-accent-gold/20 px-2 py-0.5 rounded-full uppercase tracking-widest">
                          <Lock className="w-2.5 h-2.5" />
                          <span>Locked</span>
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="font-serif text-lg mb-1">{tool.name}</h3>
                      <p className="text-[10px] font-mono text-text-muted mb-4 uppercase tracking-wider line-clamp-2">
                        {isLocked ? lockRequirement : tool.description}
                      </p>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20 w-fit">
                    {tool.hasFreeMode ? `Free + ${tool.price} cUSD` : `${tool.price} cUSD`}
                  </span>
                </motion.div>
              </Link>
            );
          })}
        </motion.div>
      </div>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="font-mono text-[10px] tracking-widest uppercase text-text-muted">Recent AI Prompts</h4>
          {recentPrompt && (
            <Link href="/app/history" className="text-[10px] font-mono text-accent hover:text-accent-gold transition-colors">
              View All →
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {recentPrompt ? (
            <Link href={`/app/history`}>
              <div className="bg-surface-2 border border-border rounded-2xl p-5 group hover:border-text-muted/40 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-serif text-md">{recentPrompt.toolName || 'Prompt'}</h4>
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      {new Date(recentPrompt.timestamp).toLocaleDateString()} · {recentPrompt.cost}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-mono text-text-muted line-clamp-2 italic">
                  "{recentPrompt.prompt}"
                </p>
              </div>
            </Link>
          ) : (
            <p className="text-text-muted font-mono text-xs italic opacity-40 py-4 border border-dashed border-border rounded-xl text-center">
              No history yet. Start your first prompt above.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
