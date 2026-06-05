'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { BookOpen, Play } from 'lucide-react';

export function HowItWorks() {
  return (
    <section id="about" className="py-24 md:py-32 px-6 bg-bg relative">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Column — Workspace Image Card with Play Overlay */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 relative group"
          >
            <div className="relative aspect-[16/10] rounded-[2rem] overflow-hidden border border-border shadow-2xl">
              <img 
                src="/images/journal_workspace.png" 
                alt="Mindful Workspace" 
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Overlay with HOW IT WORKS text */}
              <div className="absolute inset-0 bg-bg/25 flex flex-col justify-end p-8">
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-accent font-bold mb-1">Interactive System</span>
                <h3 className="font-serif text-3xl text-text-primary tracking-tight">HOW IT WORKS</h3>
              </div>
              
              {/* Pulsing Play Button Inset */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-accent text-bg rounded-full flex items-center justify-center shadow-2xl cursor-pointer transition-transform duration-300 group-hover:scale-110">
                <Play className="w-5 h-5 fill-bg stroke-bg ml-0.5" />
              </div>
            </div>
          </motion.div>

          {/* Right Column — Narrative & Copy */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-6 space-y-6 text-left"
          >
            <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">About MicroMind</span>
            
            <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
              Helping you find clarity through private writing.
            </h2>
            
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              We believe your thoughts should belong only to you. MicroMind is a local-first environment that stores all your journal entries directly in your browser. No cloud databases, no tracking, and no surveillance.
            </p>
            
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              Start writing completely free without setting up a wallet. Connect only when you need deep emotional insights, weekly summaries, or eloquent letter polishing from our AI companions.
            </p>

            <div className="pt-4">
              <Link 
                href="/app/journal" 
                className="pill-button pill-button-outline px-8 py-3.5 inline-flex text-xs font-mono tracking-wider"
              >
                Start Journaling Free
              </Link>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
