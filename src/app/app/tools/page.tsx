'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Bird, Sparkles, Search, Brain, Flame, Lock, HelpCircle } from 'lucide-react';
import Link from 'next/link';
import { TOOLS } from '@/constants/tools';
import { getEntries } from '@/lib/journal';

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 90, damping: 14 } },
} as const;

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  chat: MessageSquare,
  tweet: Bird,
  reflect: Sparkles,
  pattern: Search,
  coach: Brain,
  challenge: Flame,
};

const TOOL_SLUGS = ['chat', 'tweet', 'reflect', 'pattern', 'coach', 'challenge'];

export default function ToolsPage() {
  const [entriesCount, setEntriesCount] = useState<number>(() =>
    typeof window !== 'undefined' ? getEntries().length : 0
  );

  useEffect(() => {
    const refresh = () => setEntriesCount(getEntries().length);
    window.addEventListener('journal_updated', refresh);
    return () => window.removeEventListener('journal_updated', refresh);
  }, []);

  const tools = TOOLS.filter(t => TOOL_SLUGS.includes(t.slug));

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-24"
    >
      <motion.div variants={itemVariants}>
        <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted mb-1">AI Tools</p>
        <h1 className="text-2xl font-serif">Your toolkit</h1>
      </motion.div>

      <motion.div
        variants={containerVariants}
        className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3"
      >
        {tools.map((tool) => {
          const isReflectLocked = tool.slug === 'reflect' && entriesCount < 2;
          const isPatternLocked = tool.slug === 'pattern' && entriesCount < 5;
          const isLocked = isReflectLocked || isPatternLocked;
          const lockLabel = isReflectLocked ? '2 entries' : '5 entries';
          const Icon = TOOL_ICONS[tool.slug] || HelpCircle;

          const card = (
            <motion.div
              variants={itemVariants}
              className={`rounded-2xl border border-border bg-surface p-4 h-full flex flex-col justify-between transition ${
                isLocked ? 'opacity-40 cursor-not-allowed' : 'hover:border-accent/30 cursor-pointer'
              }`}
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="rounded-xl bg-bg/80 p-2.5 shrink-0">
                    {isLocked
                      ? <Lock className="w-4 h-4 text-text-muted" />
                      : <Icon className="w-4 h-4 text-accent" />
                    }
                  </div>
                </div>
                <h4 className="font-serif text-lg font-medium">{tool.name}</h4>
                <p className="text-[11px] text-text-muted leading-normal">
                  {isLocked ? `Requires ${lockLabel}` : tool.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3 shrink-0">
                <span className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Fee</span>
                <span className="font-mono text-[11px] font-bold text-accent">
                  {tool.hasFreeMode ? 'Free*' : `${tool.price} USDm`}
                </span>
              </div>
            </motion.div>
          );

          return isLocked
            ? <div key={tool.slug}>{card}</div>
            : <Link key={tool.slug} href={tool.route}>{card}</Link>;
        })}
      </motion.div>
    </motion.div>
  );
}
