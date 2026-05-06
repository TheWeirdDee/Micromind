'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, X, User } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';

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
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.href);
    }
  }, []);

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
        <h2 className="text-3xl font-serif mb-8 text-text-primary">Welcome to MicroMind.</h2>
        
        {isMiniPay ? (
          <div className="flex flex-col items-center">
            <p className="text-text-muted font-mono text-sm mb-8 max-w-[280px]">
              MiniPay detected. Please connect to continue.
            </p>
            <button 
              onClick={() => connect()}
              className="pill-button-primary px-10 py-4"
            >
              Connect Now
            </button>
          </div>
        ) : (
          <div className="space-y-6 w-full max-w-sm">
            {/* Option 1: Connect Button */}
            <button 
              onClick={() => connect()}
              className="w-full pill-button pill-button-primary text-sm tracking-widest"
            >
              Connect Wallet
            </button>

            <div className="flex items-center gap-4 text-text-muted opacity-30">
              <div className="h-[1px] flex-1 bg-border" />
              <span className="text-[10px] font-mono uppercase tracking-widest">Or</span>
              <div className="h-[1px] flex-1 bg-border" />
            </div>

            {/* Option 2: QR Code */}
            <div className="bg-surface border border-border p-8 rounded-[2rem] flex flex-col items-center">
              <div className="bg-white p-3 rounded-2xl mb-6">
                <QRCodeSVG 
                  value={appUrl} 
                  size={160}
                  level="H"
                />
              </div>
              
              <p className="text-text-muted font-mono text-[10px] uppercase tracking-widest leading-relaxed">
                Open in MiniPay on Android
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-up">
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
