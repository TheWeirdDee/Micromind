'use client';

import { motion } from 'framer-motion';
import { MessageSquare, FileText, X, User, Shield } from 'lucide-react';

const tools = [
  {
    icon: MessageSquare,
    name: 'Chat',
    desc: 'Ask anything.',
    price: '0.01',
    color: 'accent-green',
  },
  {
    icon: FileText,
    name: 'Resume',
    desc: 'Stand out.',
    price: '0.05',
    color: 'accent-green',
  },
  {
    icon: X,
    name: 'Tweet',
    desc: 'Go viral.',
    price: '0.01',
    color: 'accent-green',
  },
  {
    icon: User,
    name: 'Bio',
    desc: 'Own your story.',
    price: '0.02',
    color: 'accent-green',
  },
  {
    icon: Shield,
    name: 'Auditor',
    desc: 'Smart contract audit.',
    price: '0.10',
    color: 'accent-green',
  },
];

export function ToolsGrid() {
  return (
    <section className="py-32 px-6 bg-bg">
      <div className="container mx-auto max-w-6xl">
        <h2 className="text-4xl md:text-6xl font-serif mb-20 text-center md:text-left">
          Five tools. One wallet.
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tools.map((tool, i) => (
            <motion.div 
              key={tool.name}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              whileHover={{ y: -4 }}
              transition={{ duration: 0.4 }}
              className="bg-surface border border-border p-8 rounded-2xl group transition-colors hover:border-text-muted/40"
            >
              <div className="flex justify-between items-start mb-8">
                <div className="p-3 bg-surface-2 rounded-xl border border-border group-hover:border-accent-gold/40 transition-colors">
                  <tool.icon className="w-6 h-6 text-accent" />
                </div>
                <span className="font-mono text-xs font-medium text-accent-green bg-accent-green/10 px-3 py-1 rounded-full border border-accent-green/20">
                  {tool.price} cUSD
                </span>
              </div>
              
              <h3 className="text-3xl font-serif mb-2">{tool.name}</h3>
              <p className="text-text-muted font-mono text-sm">{tool.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
