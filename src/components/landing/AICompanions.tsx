'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, BrainCircuit, PenTool, ArrowRight } from 'lucide-react';

const companions = [
  {
    image: '/images/persona_reflect.webp',
    name: 'Reflection Engine',
    role: 'Weekly AI Assistant',
    desc: 'Synthesizes your weekly thoughts into compassionate, structured summaries to highlight self-growth and emotional progress.',
    focus: 'Empathy, Growth Summaries, Encouragement',
    icon: Heart,
    route: '/app/reflect',
  },
  {
    image: '/images/persona_pattern.webp',
    name: 'Pattern Analyst',
    role: 'Emotional Theme Engine',
    desc: 'Scans your long-term entry history to objectively surface 3 recurring themes and loops with gentle, actionable insights.',
    focus: 'Behavioral Themes, Actionable Insights, Objectivity',
    icon: BrainCircuit,
    route: '/app/pattern',
  },
  {
    image: '/images/persona_writer.webp',
    name: 'Writing Assistant',
    role: 'Letter Polishing & Delivery',
    desc: 'Refines raw letter drafts into warm, eloquent messages while preserving your original voice, ready to send via email.',
    focus: 'Heartfelt Expression, Tone Adjustments, Email Delivery',
    icon: PenTool,
    route: '/app/letter',
  },
];

export function AICompanions() {
  return (
    <section id="companions" className="py-24 md:py-32 px-6 bg-surface border-t border-border relative">
      <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />
      
      <div className="container mx-auto max-w-6xl relative z-10">
        
        {/* Header */}
        <div className="text-center md:text-left mb-20 space-y-4 max-w-xl">
          <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">Specialized AI Systems</span>
          <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
            AI Enhancements Built for Reflection.
          </h2>
          <p className="font-mono text-xs text-text-muted leading-relaxed">
            Our specialized AI companion engines analyze on-device journal entries, finding insights and elevating your communication on your terms.
          </p>
        </div>

        {/* 3-Column Profile Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {companions.map((c, index) => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="bg-surface-2 border border-border rounded-[2.5rem] overflow-hidden flex flex-col group hover:border-accent-gold/30 transition-all"
            >
              {/* Profile Photo Area */}
              <div className="relative aspect-[4/5] overflow-hidden border-b border-border">
                <Image
                  src={c.image}
                  alt={c.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-102"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/20 to-transparent" />
                
                {/* Floating Info Overlays inside photo */}
                <div className="absolute bottom-6 left-6 text-left">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-accent-gold bg-bg/70 border border-border/60 px-3 py-0.5 rounded-full">
                    AI Companion Engine
                  </span>
                  <h3 className="font-serif text-2xl text-text-primary mt-2">{c.name}</h3>
                  <p className="font-mono text-[10px] text-text-muted mt-0.5">{c.role}</p>
                </div>
              </div>

              {/* Description & Focus Areas */}
              <div className="p-6 space-y-4 text-left flex-grow flex flex-col justify-between">
                <p className="font-mono text-[11px] text-text-muted leading-relaxed">
                  {c.desc}
                </p>
                
                <div className="border-t border-border/60 pt-4 space-y-1.5">
                  <div className="flex items-center gap-2 text-accent-gold">
                    <c.icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-mono text-[9px] uppercase tracking-wider font-bold">Focus Areas:</span>
                  </div>
                  <p className="font-mono text-[10px] text-text-primary/80">
                    {c.focus}
                  </p>
                </div>

                <Link
                  href={c.route}
                  className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-accent hover:text-accent-gold transition-colors"
                >
                  Try this tool <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>

      </div>
    </section>
  );
}
