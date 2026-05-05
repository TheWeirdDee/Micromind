'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export function Hero() {
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <section className="relative min-h-screen flex flex-col justify-center items-center px-6 overflow-hidden">
      {/* Background Layer */}
      <div className="absolute inset-0 halftone-bg z-0" />
      
      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="max-w-5xl w-full text-center z-10 pt-32 md:pt-40"
      >
        <motion.h1 
          variants={item}
          className="text-6xl md:text-[120px] font-serif mb-12 leading-[0.95] tracking-tight text-text-primary"
        >
          AI Tools That Cost <br />
          <span className="italic text-accent">What You Actually Use.</span>
        </motion.h1>
        
        <motion.p 
          variants={item}
          className="text-text-primary/70 font-mono text-lg md:text-xl max-w-2xl mx-auto mb-16 leading-relaxed"
        >
          Pay in cUSD. Get AI. No monthly fees. No lock-in. <br className="hidden md:block" />
          Built for the next generation of Celo users.
        </motion.p>
        
        <motion.div variants={item} className="flex justify-center">
          <Link 
            href="/app" 
            className="pill-button bg-accent text-bg hover:bg-white text-xl px-12 py-5 group shadow-2xl shadow-accent/10"
          >
            Start for 0.01 cUSD 
            <span className="transition-transform duration-300 group-hover:rotate-45">→</span>
          </Link>
        </motion.div>
        
        <motion.div 
          variants={item}
          className="mt-20 flex flex-wrap justify-center gap-8 md:gap-16 opacity-40 grayscale"
        >
          <span className="font-mono text-[10px] tracking-widest uppercase">Powered by Celo</span>
          <span className="font-mono text-[10px] tracking-widest uppercase">Built for MiniPay</span>
          <span className="font-mono text-[10px] tracking-widest uppercase">Fully Onchain</span>
        </motion.div>
      </motion.div>
      
      <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-bg to-transparent pointer-events-none" />
    </section>
  );
}
