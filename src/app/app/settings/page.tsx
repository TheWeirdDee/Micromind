'use client';

import { useState } from 'react';
import { LogOut, Shield, Info, ExternalLink, Copy, Check } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';

export default function SettingsPage() {
  const { address, disconnect } = useWallet();
  const [copied, setCopied] = useState(false);
  const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

  const settings = [
    { icon: Shield, label: 'Privacy Policy', href: '#' },
    { icon: Info, label: 'About MicroMind', href: '#' },
    { icon: ExternalLink, label: 'CeloScan', href: `${IS_TESTNET ? 'https://alfajores.celoscan.io' : 'https://celoscan.io'}/address/${address}` },
  ];

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="space-y-10 animate-fade-up">
      <header>
        <h2 className="text-4xl font-serif tracking-tight">Settings</h2>
        <p className="text-text-muted font-mono text-sm mt-2">Manage your experience.</p>
      </header>

      {/* Receive Section */}
      <section className="bg-surface border border-border p-8 rounded-[2rem] flex flex-col items-center">
        <h3 className="font-mono text-[10px] uppercase tracking-widest text-text-muted mb-6">Your Wallet</h3>
        
        <div className="bg-white p-3 rounded-2xl mb-6 shadow-xl">
          <QRCodeSVG value={address || ''} size={150} level="H" />
        </div>

        <button 
          onClick={handleCopy}
          className="flex items-center gap-3 bg-surface-2 border border-border px-6 py-3 rounded-full hover:bg-white/5 transition-colors group mb-4"
        >
          <span className="font-mono text-[10px] text-text-primary">
            {address ? `${address.slice(0, 12)}...${address.slice(-8)}` : 'Not Connected'}
          </span>
          {copied ? <Check className="w-3 h-3 text-accent-green" /> : <Copy className="w-3 h-3 text-text-muted" />}
        </button>

        <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider text-center max-w-[200px] leading-relaxed">
          Share this to receive CELO
        </p>
      </section>

      <div className="space-y-2">
        {settings.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target={item.href.startsWith('http') ? '_blank' : undefined}
            className="flex items-center justify-between p-5 bg-surface border border-border rounded-2xl group hover:border-text-muted transition-colors"
          >
            <div className="flex items-center gap-4">
              <item.icon className="w-5 h-5 text-text-muted group-hover:text-accent transition-colors" />
              <span className="font-mono text-sm uppercase tracking-wider">{item.label}</span>
            </div>
          </a>
        ))}
        
        <button
          onClick={() => disconnect()}
          className="w-full flex items-center justify-between p-5 bg-surface border border-border rounded-2xl group hover:border-red-500/40 transition-colors mt-8"
        >
          <div className="flex items-center gap-4">
            <LogOut className="w-5 h-5 text-text-muted group-hover:text-red-500 transition-colors" />
            <span className="font-mono text-sm uppercase tracking-wider group-hover:text-red-500 transition-colors">Disconnect Wallet</span>
          </div>
        </button>
      </div>

      <div className="text-center pt-10">
        <p className="font-mono text-[10px] tracking-widest uppercase text-text-muted opacity-30">
          MicroMind Version 2.0.0 <br />
          Built with love on Celo
        </p>
      </div>
    </div>
  );
}
