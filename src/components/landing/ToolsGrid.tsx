'use client';

import { motion } from 'framer-motion';
import { BookOpen, MessageSquare, Bird, Sparkles, Search, Mail } from 'lucide-react';
import Link from 'next/link';

const tools = [
  {
    icon: BookOpen,
    slug: 'journal',
    name: 'Journal Core',
    desc: 'Write freely. Your private thoughts stay completely local on your device.',
    price: 'Free',
    btnText: 'Write Entry',
    route: '/app/journal',
  },
  {
    icon: Sparkles,
    slug: 'reflect',
    name: 'Weekly Reflect',
    desc: 'AI reads your recent entries and synthesizes a compassionate weekly reflection.',
    price: '0.005 cUSD',
    btnText: 'Get Reflection',
    route: '/app/reflect',
  },
  {
    icon: Search,
    slug: 'pattern',
    name: 'Pattern Analyst',
    desc: 'AI analyzes all your entries to uncover recurring emotional themes and insights.',
    price: '0.005 cUSD',
    btnText: 'Find Patterns',
    route: '/app/pattern',
  },
  {
    icon: Mail,
    slug: 'letter',
    name: 'Heartfelt Letter',
    desc: 'Write a letter to anyone and send it to their inbox. Optional paid AI polish.',
    price: 'Free + 0.01 cUSD',
    btnText: 'Send Letter',
    route: '/app/letter',
  },
  {
    icon: Bird,
    slug: 'tweet',
    name: 'Tweet Gen',
    desc: 'Draft authentic tweets from your private entries with a single click.',
    price: '0.005 cUSD',
    btnText: 'Draft Tweet',
    route: '/app/tweet',
  },
  {
    icon: MessageSquare,
    slug: 'chat',
    name: 'Mind Chat',
    desc: 'General AI companion. Ask questions or discuss thoughts privately.',
    price: '0.005 cUSD',
    btnText: 'Open Chat',
    route: '/app/chat',
  },
];

export function ToolsGrid() {
  return (
    <section id="features" className="py-24 md:py-32 px-6 bg-bg relative border-t border-border">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-20 gap-6">
          <div className="space-y-4 text-left max-w-xl">
            <span className="font-mono text-[10px] tracking-widest uppercase text-accent-gold">Our Services</span>
            <h2 className="text-3xl md:text-5xl font-serif leading-tight text-text-primary">
              AI-Powered Reflections At Your Own Pace.
            </h2>
          </div>
          <p className="font-mono text-xs text-text-muted max-w-sm text-left leading-relaxed">
            We offer modular, pay-per-use AI tools designed to enhance your journaling practice, helping you discover patterns, send letters, and reflect deeply on your own schedule.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, index) => (
            <motion.div
              key={tool.name}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.05, duration: 0.5 }}
              className="bg-surface border border-border p-6 rounded-2xl flex flex-col justify-between items-start text-left relative overflow-hidden group hover:border-accent/30 transition-colors"
            >
              <div className="w-full">
                {/* Top header row */}
                <div className="flex justify-between items-center mb-6 w-full">
                  <div className="p-2.5 bg-surface-2 rounded-xl border border-border group-hover:border-accent-gold/40 transition-colors">
                    <tool.icon className="w-5 h-5 text-accent" />
                  </div>
                  <span className="font-mono text-[9px] text-accent-green bg-accent-green/10 px-2.5 py-0.5 rounded-full border border-accent-green/20 uppercase tracking-wider">
                    {tool.price}
                  </span>
                </div>

                <h3 className="text-2xl font-serif text-text-primary mb-2">{tool.name}</h3>
                <p className="text-text-muted font-mono text-[11px] leading-relaxed mb-8">{tool.desc}</p>
              </div>

              {/* Action Button inside Card */}
              <Link 
                href={tool.route}
                className="w-full pill-button pill-button-outline text-xs py-2.5 group-hover:bg-accent group-hover:text-bg group-hover:border-accent transition-all duration-300"
              >
                {tool.btnText}
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
