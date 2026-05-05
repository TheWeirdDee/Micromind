'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, X, User } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';

const tools = [
  {
    icon: MessageSquare,
    name: 'Chat',
    href: '/app/chat',
    desc: 'Ask anything.',
    price: '0.01 cUSD',
  },
  {
    icon: FileText,
    name: 'Resume',
    href: '/app/resume',
    desc: 'Stand out.',
    price: '0.05 cUSD',
  },
  {
    icon: X,
    name: 'Tweet',
    href: '/app/tweet',
    desc: 'Go viral.',
    price: '0.01 cUSD',
  },
  {
    icon: User,
    name: 'Bio',
    href: '/app/bio',
    desc: 'Own your story.',
    price: '0.02 cUSD',
  },
];

export default function AppHome() {
  const { isConnected, isMiniPay, connect } = useWallet();
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
        <h2 className="text-3xl font-serif mb-6 text-text-primary">Welcome to MicroMind.</h2>
        
        {!isMiniPay ? (
          <div className="bg-surface border border-border p-8 rounded-3xl max-w-sm w-full">
            <p className="text-text-muted font-mono text-xs uppercase tracking-widest mb-6 leading-relaxed">
              MicroMind runs inside MiniPay. Open this URL on your phone in the MiniPay app to connect your wallet.
            </p>
            <button 
              onClick={handleCopy}
              className="w-full pill-button bg-accent text-bg px-8 py-3 flex items-center justify-center gap-2"
            >
              {copied ? 'Link Copied!' : 'Copy App Link'}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <p className="text-text-muted font-mono text-sm mb-8 max-w-[280px]">
              Detecting MiniPay wallet...
            </p>
            <button 
              onClick={() => connect()}
              className="pill-button bg-accent text-bg px-10 py-4"
            >
              Connect Now
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <header>
        <h2 className="text-4xl font-serif mb-2 tracking-tight">
          What do you want <br /> to build?
        </h2>
        <p className="text-text-muted font-mono text-sm">Select a tool to begin.</p>
      </header>
      
      <div className="grid grid-cols-2 gap-4">
        {tools.map((tool, i) => (
          <Link key={tool.name} href={tool.href}>
            <motion.div 
              whileTap={{ scale: 0.98 }}
              className="bg-surface border border-border p-5 rounded-2xl flex flex-col gap-4 group hover:border-text-muted transition-colors"
            >
              <div className="p-2.5 bg-surface-2 rounded-xl w-fit border border-border group-hover:border-accent-gold/40 transition-colors">
                <tool.icon className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-serif text-xl mb-1">{tool.name}</h3>
                <p className="text-[10px] font-mono text-text-muted mb-3 uppercase tracking-wider">{tool.desc}</p>
                <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
                  {tool.price}
                </span>
              </div>
            </motion.div>
          </Link>
        ))}
      </div>

      <section className="space-y-6">
        <h4 className="font-mono text-[10px] tracking-widest uppercase text-text-muted">Recent Prompts</h4>
        <div className="space-y-3">
          <p className="text-text-muted font-mono text-xs italic opacity-40 py-4 border border-dashed border-border rounded-xl text-center">
            No history yet. Start your first prompt above.
          </p>
        </div>
      </section>
    </div>
  );
}
