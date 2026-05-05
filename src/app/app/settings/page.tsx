'use client';

import { useDisconnect, useAccount } from 'wagmi';
import { LogOut, Shield, Info, ExternalLink } from 'lucide-react';

export default function SettingsPage() {
  const { address } = useAccount();
  const { disconnect } = useDisconnect();

  const settings = [
    { icon: Shield, label: 'Privacy Policy', href: '#' },
    { icon: Info, label: 'About MicroMind', href: '#' },
    { icon: ExternalLink, label: 'CeloScan', href: `https://celoscan.io/address/${address}` },
  ];

  return (
    <div className="space-y-10">
      <header>
        <h2 className="text-4xl font-serif tracking-tight">Settings</h2>
        <p className="text-text-muted font-mono text-sm mt-2">Manage your experience.</p>
      </header>

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

      <div className="text-center pt-20">
        <p className="font-mono text-[10px] tracking-widest uppercase text-text-muted opacity-30">
          MicroMind Version 2.0.0 <br />
          Built with love on Celo
        </p>
      </div>
    </div>
  );
}
