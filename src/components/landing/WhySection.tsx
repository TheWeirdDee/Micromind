'use client';

import { motion } from 'framer-motion';

export function WhySection() {
  return (
    <section className="py-32 px-6 bg-surface-2/30">
      <div className="container mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-20">
        <motion.h2 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="text-5xl md:text-7xl font-serif tracking-tight leading-[1.1]"
        >
          AI that doesn't <br />
          <span className="text-accent-gold">drain your wallet.</span>
        </motion.h2>
        
        <div className="flex flex-col gap-12">
          {[
            "No subscription. No credit card. Just cUSD.",
            "Fully onchain. Every prompt is a transaction.",
            "Built for MiniPay's 14M+ users."
          ].map((point, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-6 items-start"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-accent-gold mt-2.5 flex-shrink-0" />
              <p className="text-xl md:text-2xl font-mono text-text-primary">
                {point}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
