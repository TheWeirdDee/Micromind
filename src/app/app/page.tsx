'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, FileText, X, User, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';

import { TOOLS } from '@/constants/tools';
import { DailyStreak } from '@/components/app/DailyStreak';
import { getHistory, type HistoryItem } from '@/lib/storage';

export default function AppHome() {
  const { isConnected, address, isMiniPay, connect } = useWallet();
  const [appUrl, setAppUrl] = useState('');
  const [recentPrompt, setRecentPrompt] = useState<HistoryItem | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const url = process.env.NEXT_PUBLIC_APP_URL || (window.location.origin + '/app');
      setAppUrl(url);
      
      if (!process.env.NEXT_PUBLIC_APP_URL) {
        console.warn(
          'NEXT_PUBLIC_APP_URL not set. ' +
          'QR code will use localhost. ' +
          'Add this in Vercel dashboard after deploying.'
        );
      }
      
      const hist = getHistory();
      if (hist && hist.length > 0) {
        setRecentPrompt(hist[0]);
      }
    }
  }, []);

  // If not connected, show connect screen
  if (!isConnected || !address) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-8">
        <h2 className="text-3xl font-serif mb-8 text-text-primary">Welcome to MicroMind.</h2>
        
        {/* Hide connect button inside MiniPay */}
        {!isMiniPay ? (
          <div className="space-y-6 w-full max-w-sm">
            <button 
              onClick={() => connect()}
              className="w-full pill-button pill-button-primary text-sm tracking-widest"
            >
              Connect Wallet
            </button>

            <div className="flex items-center gap-4 text-text-muted opacity-30">
              <div className="h-[1px] flex-1 bg-border" />
              <span className="text-[10px] font-mono uppercase tracking-widest">— or open directly in MiniPay —</span>
              <div className="h-[1px] flex-1 bg-border" />
            </div>

            <div className="bg-surface border border-border p-8 rounded-[2rem] flex flex-col items-center">
              <div className="bg-white p-3 rounded-2xl mb-6">
                <QRCodeSVG 
                  value={appUrl} 
                  size={200}
                  level="H"
                />
              </div>
              
              <p className="text-text-muted font-mono text-[10px] uppercase tracking-widest leading-relaxed mb-6">
                Scan with your phone camera, <br /> then open in MiniPay
              </p>

              <button 
                onClick={() => {
                  navigator.clipboard.writeText(appUrl);
                  alert('App link copied to clipboard!');
                }}
                className="text-[10px] font-mono text-accent uppercase tracking-widest border border-accent/20 px-4 py-2 rounded-full hover:bg-accent/5 transition-colors"
              >
                Copy App Link
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
            <p className="text-text-muted font-mono text-sm max-w-[280px]">
              MiniPay detected. <br />
              Connecting automatically...
            </p>
          </div>
        )}
      </div>
    );
  }

  // Only show app content when connected
  return (
    <div className="space-y-8 animate-fade-up">
      <header>
        <h2 className="text-4xl font-serif mb-2 tracking-tight">
          What do you want <br /> to build?
        </h2>
        <p className="text-text-muted font-mono text-sm">Select a tool to begin.</p>
      </header>

      <DailyStreak />
      
      <motion.div 
        variants={{
          hidden: { opacity: 0 },
          show: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4"
      >
        {TOOLS.map((tool, i) => (
          <Link key={tool.name} href={tool.route}>
            <motion.div
              variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0 }
              }}
              whileTap={{ scale: 0.98 }}
              className="bg-surface border border-border p-5 rounded-2xl flex flex-col gap-4 group hover:border-text-muted transition-colors"
            >
              <div className="p-2.5 rounded-xl w-fit border border-border bg-surface-2 group-hover:border-accent-gold/40 transition-colors">
                <span className="text-xl">{tool.icon}</span>
              </div>
              <div>
                <h3 className="font-serif text-xl mb-1">{tool.name}</h3>
                <p className="text-[10px] font-mono text-text-muted mb-3 uppercase tracking-wider">{tool.description}</p>
                <span className="text-[10px] font-mono text-accent-green px-2 py-0.5 rounded-full bg-accent-green/10 border border-accent-green/20">
                  {tool.hasFreeMode ? `Free + ${tool.price} cUSD` : `${tool.price} cUSD`}
                </span>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>

      <section className="space-y-6">
        <div className="flex justify-between items-center">
          <h4 className="font-mono text-[10px] tracking-widest uppercase text-text-muted">Recent Prompts</h4>
          {recentPrompt && (
            <Link href="/app/history" className="text-[10px] font-mono text-accent hover:text-accent-gold transition-colors">
              View All →
            </Link>
          )}
        </div>
        <div className="space-y-3">
          {recentPrompt ? (
            <Link href={`/app/history`}>
              <div className="bg-surface-2 border border-border rounded-2xl p-5 group hover:border-text-muted/40 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-serif text-md">{recentPrompt.toolName || 'Prompt'}</h4>
                    <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                      {new Date(recentPrompt.timestamp).toLocaleDateString()} · {recentPrompt.cost}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-mono text-text-muted line-clamp-2 italic">
                  "{recentPrompt.prompt}"
                </p>
              </div>
            </Link>
          ) : (
            <p className="text-text-muted font-mono text-xs italic opacity-40 py-4 border border-dashed border-border rounded-xl text-center">
              No history yet. Start your first prompt above.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
