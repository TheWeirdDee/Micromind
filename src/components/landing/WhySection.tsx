'use client';

import { motion } from 'framer-motion';
import { HardDrive, Coins, Shield, Smartphone } from 'lucide-react';

const benefits = [
  {
    icon: HardDrive,
    title: 'Your Data, Your Device',
    desc: 'Every journal entry lives only on your phone. We run zero cloud databases that store your raw thoughts — not now, not ever.',
  },
  {
    icon: Coins,
    title: 'Pay Only for AI, Never a Subscription',
    desc: 'Write as much as you want, for free, forever. Only pay tiny fractions (0.01 cUSD ≈ $0.01) when you want AI to read and analyze your writing.',
  },
  {
    icon: Shield,
    title: 'Transparent Micro-Billing',
    desc: 'When you do pay, it\'s logged on the Celo blockchain — no hidden fees, no opaque monthly charges. Every transaction is public and auditable.',
  },
  {
    icon: Smartphone,
    title: 'Built for MiniPay',
    desc: 'First-class support for Opera MiniPay. Auto-detects your wallet on launch, near-zero gas fees, and a UI designed for mobile screens.',
  },
];

const stats = [
  { value: '0', label: 'Cloud databases' },
  { value: '~0.01', label: 'cUSD per AI insight' },
  { value: '100%', label: 'Local-first storage' },
];

export function WhySection() {
  return (
    <section id="privacy" className="py-24 md:py-32 px-6 bg-surface-2/10 border-t border-border relative">
      <div className="container mx-auto max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">

          {/* Left Column */}
          <div className="lg:col-span-7 space-y-12 text-left">
            <div className="space-y-4">
              <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">Why MicroMind</span>
              <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
                Privacy and AI together —<br className="hidden md:block" /> without compromise.
              </h2>
              <p className="font-mono text-xs text-text-muted leading-relaxed max-w-xl">
                Most AI journaling tools store your thoughts on their servers. MicroMind keeps everything on your device, only reaching the internet when you choose to pay for an AI insight.
              </p>
            </div>

            {/* Stats strip */}
            <div className="grid grid-cols-3 gap-4">
              {stats.map((s) => (
                <div key={s.label} className="space-y-1 border border-border bg-surface rounded-xl px-4 py-3">
                  <p className="font-mono text-xl font-bold text-accent">{s.value}</p>
                  <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Benefits grid */}
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

          {/* Right Column — Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="lg:col-span-5 flex justify-center lg:justify-end"
          >
            <div className="relative w-full max-w-[340px] aspect-[4/5] rounded-[5rem] overflow-hidden border border-border shadow-2xl">
              <img
                src="/images/journal_reflection.webp"
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
