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
  const [copied, setCopied] = useState(false);
  const [appUrl, setAppUrl] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppUrl(window.location.href);
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
        <h2 className="text-3xl font-serif mb-8 text-text-primary">Welcome to MicroMind.</h2>
        
        {!isMiniPay ? (
          <div className="bg-surface border border-border p-8 rounded-[2rem] max-w-sm w-full flex flex-col items-center">
            <div className="bg-[#1A1A1A] p-4 rounded-2xl mb-6 border border-white/5">
              <QRCodeSVG 
                value={appUrl} 
                size={180}
                bgColor="#1A1A1A"
                fgColor="#E8E0CC"
                level="H"
                includeMargin={false}
              />
            </div>
            
            <p className="text-text-muted font-mono text-[10px] uppercase tracking-widest mb-8 leading-relaxed max-w-[200px]">
              Scan with your phone's camera, then open in MiniPay
            </p>

            <button 
              onClick={handleCopy}
              className="w-full text-[10px] font-mono tracking-[0.2em] uppercase text-text-muted hover:text-accent transition-colors"
            >
              {copied ? 'Link Copied!' : 'Copy Link Instead'}
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
