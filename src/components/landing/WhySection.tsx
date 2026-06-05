'use client';

import { motion } from 'framer-motion';
import { Shield, Coins, Activity, Check } from 'lucide-react';

const benefits = [
  {
    icon: Shield,
    title: 'On-Device Privacy',
    desc: 'All your journal entries stay inside local storage on your device. We have zero backend databases storing your raw thoughts.',
  },
  {
    icon: Coins,
    title: 'Pay-per-Prompt Economy',
    desc: 'No monthly $15+ subscriptions. Write for free, and pay only fractions of a cent (0.005 cUSD) when you ask for AI reflections.',
  },
  {
    icon: Activity,
    title: 'Onchain Verification',
    desc: 'Transactions trigger the AI agent directly on the Celo blockchain, logging transparent, verifiable micro-billing actions.',
  },
  {
    icon: Check,
    title: 'Optimized for MiniPay',
    desc: 'Tailored for Opera MiniPay and mobile browsers, supporting automatic wallet detection and near-instant processing.',
  },
];

export function WhySection() {
  return (
    <section id="privacy" className="py-24 md:py-32 px-6 bg-surface-2/10 border-t border-border relative">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
          
          {/* Left Column — Why Us & Feature List */}
          <div className="lg:col-span-7 space-y-12 text-left">
            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">Why Choose MicroMind</span>
              <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
                Transform Your Thinking with Total Onchain Privacy.
              </h2>
              <p className="font-mono text-xs text-text-muted leading-relaxed max-w-xl">
                MicroMind combines personal mental growth with modern micro-crypto payments, giving you a private writing space that respects both your data and your wallet.
              </p>
            </div>

            {/* Benefits List (2x2 Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {benefits.map((b) => (
                <div key={b.title} className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 bg-accent/10 border border-accent/20 rounded-lg text-accent">
                      <b.icon className="w-4 h-4" />
                    </div>
                    <h4 className="font-serif text-lg text-text-primary">{b.title}</h4>
                  </div>
                  <p className="font-mono text-[11px] text-text-muted leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column — Large Vertical Arched Image */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-[5rem] overflow-hidden border border-border shadow-2xl">
              <img 
                src="/images/journal_reflection.png" 
                alt="Personal reflection" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-bg/30 to-transparent" />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
