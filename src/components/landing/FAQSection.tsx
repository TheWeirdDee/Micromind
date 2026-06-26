'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Mail, ExternalLink } from 'lucide-react';

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const faqs = [
  {
    q: "What is MicroMind?",
    a: "MicroMind is a privacy-first AI journaling app built on Celo. Write freely, reflect deeply, and use AI-powered tools with small USDm micropayments — no subscriptions required.",
  },
  {
    q: "How does pay-per-prompt work?",
    a: "Each AI tool costs just 0.005 USDm per use, paid directly from your wallet on Celo. No monthly fees, no lock-in. You pay only for what you actually use.",
  },
  {
    q: "What AI tools are available?",
    a: "MicroMind includes AI Chat (0.005 USDm), Tweet Polish (0.005 USDm), Weekly Reflect (0.005 USDm), Pattern Analyst (0.005 USDm), and Heartfelt Letters AI Polish (0.01 USDm) — each optimized for a different kind of thinking and self-expression.",
  },
  {
    q: "What makes MicroMind different from other journaling apps?",
    a: "MicroMind is built on Celo and designed for MiniPay — meaning no subscriptions, no vendor lock-in, and no data harvesting. You connect with your wallet, own your data, and pay only for the AI you actually use.",
  },
  {
    q: "Do I need a crypto wallet to use MicroMind?",
    a: "MicroMind is designed for MiniPay on Celo — a lightweight mobile wallet. You just need a small amount of USDm (Celo's stablecoin) to start using AI features.",
  },
];

export function FAQSection() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <>
      {/* -- FAQ ------------------------------------------------------- */}
      <section id="faq" className="py-24 px-6 bg-bg border-t border-border">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

            {/* Left — heading + CTA */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="lg:sticky lg:top-28 space-y-6"
            >
              <div>
                <h2 className="font-serif text-4xl md:text-5xl text-accent-gold leading-tight">
                  Any questions?
                </h2>
                <p className="font-serif text-3xl md:text-4xl text-text-primary font-bold mt-1">
                  We are here to&nbsp;help.
                </p>
              </div>
              <p className="font-mono text-sm text-text-muted leading-relaxed max-w-xs">
                Everything you need to know about MicroMind, Celo payments, and your privacy.
              </p>
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-gold text-bg font-mono text-xs font-bold uppercase tracking-wider rounded-full hover:brightness-110 transition-all"
              >
                Contact Us
              </a>
            </motion.div>

            {/* Right — accordion */}
            <div className="divide-y divide-border">
              {faqs.map((faq, i) => (
                <motion.div
                  key={i}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.2 }}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="py-5"
                >
                  <button
                    onClick={() => setOpen(open === i ? null : i)}
                    className="w-full flex items-center justify-between gap-4 text-left group"
                  >
                    <span className="font-mono text-sm text-text-primary group-hover:text-accent transition-colors">
                      {faq.q}
                    </span>
                    <span
                      className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-all duration-300 ${
                        open === i
                          ? 'border-accent-gold text-accent-gold rotate-45'
                          : 'border-border text-text-muted group-hover:border-text-muted'
                      }`}
                    >
                      <Plus size={12} />
                    </span>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      open === i ? 'max-h-40 mt-3' : 'max-h-0'
                    }`}
                  >
                    <p className="font-mono text-xs text-text-muted leading-relaxed pr-10">
                      {faq.a}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* -- Wave divider ---------------------------------------------- */}
      <div className="bg-bg overflow-hidden leading-none">
        <svg
          viewBox="0 0 1440 70"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          className="w-full block h-[70px]"
        >
          <path
            d="M0,20 C240,70 480,0 720,40 C960,80 1200,10 1440,50 L1440,70 L0,70 Z"
            fill="#111111"
          />
        </svg>
      </div>

      {/* -- Contact --------------------------------------------------- */}
      <section id="contact" className="bg-surface py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <motion.div
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, amount: 0.3 }}
              variants={fadeUp}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-2"
            >
              <h2 className="font-serif text-4xl md:text-5xl text-accent-gold leading-tight">
                How can we help?
              </h2>
              <p className="font-serif text-3xl md:text-4xl text-text-primary font-bold">
                Contact us anytime.
              </p>
            </motion.div>

            {/* Right — contact cards */}
            <div className="flex flex-col sm:flex-row gap-4">
              {[
                { href: "https://github.com/TheWeirdDee/Micromind/issues", icon: <Mail size={9} />, label: "Report an issue" },
                { href: "https://github.com/TheWeirdDee/Micromind", icon: <ExternalLink size={9} />, label: "Open source" },
              ].map((card, i) => (
                <motion.a
                  key={card.label}
                  href={card.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, amount: 0.3 }}
                  variants={fadeUp}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex-1 bg-surface-2 border border-border rounded-xl p-5 hover:border-accent-gold/50 transition-all group"
                >
                  <p className="font-mono text-[9px] uppercase tracking-widest text-text-muted mb-2.5 flex items-center gap-1.5">
                    {card.icon}
                    {card.label}
                  </p>
                  <p className="font-mono text-xs text-text-primary group-hover:text-accent-gold transition-colors">
                    github.com/TheWeirdDee/Micromind
                  </p>
                </motion.a>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
