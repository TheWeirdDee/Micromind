'use client';

import { motion } from 'framer-motion';

const steps = [
  {
    num: '01',
    title: 'Write freely',
    desc: 'Your journal lives on your device. No account. No cloud. Just words.',
  },
  {
    num: '02',
    title: 'Reflect with AI',
    desc: 'Connect your wallet when you want insight. Pay a few cents in cUSD. Get a deeply personal AI response.',
  },
  {
    num: '03',
    title: 'Grow over time',
    desc: 'Patterns emerge. Reflections accumulate. Your journal becomes a record of who you are.',
  },
];

export function HowItWorks() {
  return (
    <section className="py-32 px-6 bg-bg">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-6xl font-serif mb-20 text-center md:text-left">
          Three steps.
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 md:gap-24 relative">
          <div className="hidden md:block absolute top-12 left-[10%] right-[10%] border-t border-dashed border-border z-0" />
          
          {steps.map((step, i) => (
            <motion.div 
              key={step.num}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2 }}
              className="relative z-10"
            >
              <div className="text-4xl font-mono text-accent-gold/40 mb-6">{step.num}</div>
              <h3 className="text-2xl font-serif mb-4">{step.title}</h3>
              <p className="text-text-muted font-mono text-sm leading-relaxed max-w-[280px]">
                {step.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
