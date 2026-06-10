'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { Sparkles, BookOpen, Lock } from 'lucide-react';

export function Hero() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section className="relative min-h-screen bg-bg flex flex-col justify-between pt-24 overflow-hidden">
      <div className="absolute inset-0 halftone-bg z-0 opacity-40 pointer-events-none" />
      
      {/* Upper Grid Section */}
      <div className="container mx-auto px-6 max-w-6xl z-10 flex-grow flex items-center py-12">
        <motion.div 
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center w-full"
        >
          {/* Left Column — Text & CTAs */}
          <div className="lg:col-span-7 space-y-8 text-left">
            <motion.h1 
              variants={item}
              className="text-[clamp(2.5rem,6vw,4.5rem)] font-serif leading-[1.05] tracking-tight text-text-primary"
            >
              Embrace Your <br />
              <span className="italic text-accent">Inner Clarity.</span>
            </motion.h1>
            
            <motion.p 
              variants={item}
              className="text-text-primary/80 font-mono text-sm md:text-base max-w-xl leading-relaxed"
            >
              A private, on-device journal for clear thinking, emotional awareness, and self-reflection. Write freely for free, and unlock pay-per-prompt AI insights only when you choose.
            </motion.p>
            
            <motion.div 
              variants={item} 
              className="flex flex-wrap gap-4 pt-2"
            >
              <Link 
                href="/app" 
                className="pill-button bg-accent text-bg hover:bg-white text-sm px-8 py-4 group shadow-xl shadow-accent/5 font-mono"
              >
                Explore App 
                <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
              </Link>
              <a 
                href="#about" 
                className="pill-button pill-button-outline text-sm px-8 py-4 font-mono"
              >
                See How It Works
              </a>
            </motion.div>
          </div>

          {/* Right Column — Large Serene Image */}
          <motion.div 
            variants={item}
            className="lg:col-span-5 relative flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[380px] aspect-[4/5] rounded-[3rem] overflow-hidden border border-border shadow-2xl">
              <img 
                src="/images/journal_hero.jpg" 
                alt="Mindful journaling" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/40 to-transparent" />
            </div>

            {/* Circular Overlapping Inset Badge */}
            <motion.div 
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="absolute -bottom-6 -left-6 bg-surface border border-border p-4 rounded-full shadow-2xl flex items-center justify-center"
            >
              <div className="bg-accent/10 p-3 rounded-full border border-accent/20">
                <Sparkles className="w-6 h-6 text-accent" />
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>

      {/* Lower Stats/Principles Section */}
      <div className="bg-surface border-t border-border z-10 py-12 px-6">
        <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center">
          {/* Stats row */}
          <div className="lg:col-span-7 grid grid-cols-3 gap-4 border-b lg:border-b-0 lg:border-r border-border pb-8 lg:pb-0 lg:pr-16">
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-accent flex items-center gap-1.5">
                <Lock className="w-5 h-5 shrink-0 text-accent/60" />
                <span>100%</span>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Private & Local</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-accent flex items-center gap-1.5">
                <Sparkles className="w-5 h-5 shrink-0 text-accent/60" />
                <span>0.005</span>
              </div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted">cUSD per prompt</p>
            </div>
            <div className="space-y-1">
              <div className="text-2xl md:text-3xl font-serif text-accent">0</div>
              <p className="font-mono text-[9px] uppercase tracking-wider text-text-muted">Monthly Fees</p>
            </div>
          </div>

          {/* Stat description block */}
          <div className="lg:col-span-5 space-y-4 text-left">
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              Write freely without accounts. When you want AI to summarize your week, find emotional patterns, or polish a letter, pay a fraction of a cent. Powered by Celo micro-transactions.
            </p>
            <Link 
              href="#features" 
              className="font-mono text-[10px] text-accent-gold uppercase tracking-wider hover:underline"
            >
              Explore AI Assist Tools →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
