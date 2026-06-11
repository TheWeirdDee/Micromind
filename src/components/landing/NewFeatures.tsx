'use client';

import { motion } from 'framer-motion';
import { Cloud, TrendingUp, Cpu, Sparkles } from 'lucide-react';

const MOCK_WORDS = [
  { text: 'love', size: 'text-3xl md:text-4xl font-bold', color: 'text-amber-200' },
  { text: 'peace', size: 'text-2xl md:text-3xl font-bold', color: 'text-blue-300' },
  { text: 'growth', size: 'text-xl md:text-2xl font-semibold', color: 'text-emerald-300' },
  { text: 'mindful', size: 'text-lg md:text-xl font-semibold', color: 'text-purple-300' },
  { text: 'hope', size: 'text-base md:text-lg font-medium', color: 'text-rose-300' },
  { text: 'create', size: 'text-sm md:text-base font-medium', color: 'text-cyan-300' },
  { text: 'focus', size: 'text-xs md:text-sm', color: 'text-amber-200' },
  { text: 'calm', size: 'text-xs md:text-sm', color: 'text-blue-300' },
  { text: 'energy', size: 'text-xs', color: 'text-emerald-300' },
  { text: 'insight', size: 'text-xs', color: 'text-purple-300' }
];

export function NewFeatures() {
  return (
    <section className="py-24 bg-surface border-y border-border relative overflow-hidden">
      <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            Newly Released Features
          </div>
          <h2 className="text-4xl md:text-5xl font-serif tracking-tight">Meet Your New Cognitive Insights</h2>
          <p className="text-text-muted leading-relaxed">
            We've upgraded MicroMind with local-first mental analytics and cognitive visualization tools to help you understand your emotional trends better.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Feature details */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-border bg-bg/50 p-6 flex gap-4 hover:border-accent/30 transition-all">
              <div className="rounded-xl bg-accent/10 p-3 h-fit text-accent">
                <Cloud className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif">Local Word Cloud</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  A private text processor that filters common stop words from your entries and builds a beautiful, weighted cloud of your most frequent thoughts right on your dashboard.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg/50 p-6 flex gap-4 hover:border-accent/30 transition-all">
              <div className="rounded-xl bg-accent/10 p-3 h-fit text-accent-gold">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif">Emotional Dynamics</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  New analytics tracking your weekly **Positivity Ratio** and **Mood Stability**. Watch your emotional consistency rise as you build your reflection habit.
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-bg/50 p-6 flex gap-4 hover:border-accent/30 transition-all">
              <div className="rounded-xl bg-accent/10 p-3 h-fit text-accent">
                <Cpu className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-serif">Writing Velocity & Counters</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Subtle characters, words, and estimated reading time indicators embedded directly inside your editor to support your writing flow.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive visual cloud mockup */}
          <div className="rounded-[2.5rem] border border-border bg-surface-2 p-8 shadow-2xl relative group">
            <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-accent/10 to-accent-gold/10 opacity-30 blur-xl group-hover:opacity-50 transition-opacity" />
            <div className="relative z-10 space-y-6">
              <div className="flex items-center justify-between border-b border-border/60 pb-4">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.35em] text-text-muted">Live Preview</p>
                  <p className="text-lg font-serif text-text-primary mt-0.5">Your Mind Cloud</p>
                </div>
                <span className="text-[10px] font-mono px-2 py-1 bg-accent/10 rounded-lg text-accent">Local Analyzer</span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-3 items-center justify-center p-6 rounded-2xl bg-bg/40 border border-border/40 min-h-[220px]">
                {MOCK_WORDS.map((w, i) => (
                  <motion.span
                    key={w.text}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05, type: 'spring' }}
                    className={`${w.size} ${w.color} transition-all duration-300 hover:scale-110 cursor-default select-none`}
                  >
                    {w.text}
                  </motion.span>
                ))}
              </div>

              <div className="pt-2 flex justify-between items-center text-[10px] font-mono text-text-muted">
                <span>Updated in real-time</span>
                <span>100% Client-Side Encryption</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
