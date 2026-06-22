'use client';

import { motion } from 'framer-motion';
import { Cloud, TrendingUp, Cpu, Sparkles, Mic } from 'lucide-react';

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
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto mb-16 space-y-4"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-xs font-mono text-accent">
            <Sparkles className="w-3.5 h-3.5" />
            Newly Released Features
          </div>
          <h2 className="text-4xl md:text-5xl font-serif tracking-tight">Meet Your New Cognitive Insights</h2>
          <p className="text-text-muted leading-relaxed">
            We&apos;ve upgraded MicroMind with local-first mental analytics and cognitive visualization tools to help you understand your emotional trends better.
          </p>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-2 items-center">
          {/* Feature details */}
          <div className="space-y-6">
            {[
              { icon: <Cloud className="w-6 h-6" />, color: 'text-accent', title: 'Local Word Cloud', desc: 'A private text processor that filters common stop words from your entries and builds a beautiful, weighted cloud of your most frequent thoughts right on your dashboard.', dashed: false },
              { icon: <TrendingUp className="w-6 h-6" />, color: 'text-accent-gold', title: 'Emotional Dynamics', desc: 'New analytics tracking your weekly Positivity Ratio and Mood Stability. Watch your emotional consistency rise as you build your reflection habit.', dashed: false },
              { icon: <Cpu className="w-6 h-6" />, color: 'text-accent', title: 'Writing Velocity & Counters', desc: 'Subtle characters, words, and estimated reading time indicators embedded directly inside your editor to support your writing flow.', dashed: false },
              { icon: <Mic className="w-6 h-6" />, color: 'text-accent', title: 'Voice Journaling', desc: 'Speak your thoughts and have them transcribed straight into a journal entry, fully on-device.', dashed: true, badge: 'Coming Soon' },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className={`rounded-2xl border ${f.dashed ? 'border-dashed opacity-80' : ''} border-border bg-bg/50 p-6 flex gap-4 hover:border-accent/30 transition-all`}
              >
                <div className={`rounded-xl bg-accent/10 p-3 h-fit ${f.color}`}>
                  {f.icon}
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xl font-serif">{f.title}</h3>
                    {f.badge && (
                      <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-accent-gold">
                        {f.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-muted leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Interactive visual cloud mockup */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-[2.5rem] border border-border bg-surface-2 p-8 shadow-2xl relative group"
          >
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
          </motion.div>
        </div>
      </div>
    </section>
  );
}
