'use client';

import { WalletBadge } from './WalletBadge';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { useWallet } from '@/context/WalletContext';
import { LogOut, Settings } from 'lucide-react';

export function AppHeader() {
  const { isConnected, disconnect } = useWallet();

  const handleDisconnect = () => {
    if (window.confirm('Disconnect your wallet?')) {
      disconnect();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-2 px-4 sm:px-6 lg:px-8">
        <Link 
          href="/" 
          className="shrink-0 transition-opacity hover:opacity-80"
          title="Return to Home"
        >
          <Logo className="h-[20px] w-auto" />
        </Link>

        <div className="flex items-center gap-1 overflow-hidden min-w-0">
          <WalletBadge />
          {isConnected && (
            <button
              onClick={handleDisconnect}
              className="p-1.5 text-text-muted hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-all shrink-0"
              title="Disconnect Wallet"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
          <Link
            href="/app/settings"
            className="p-1.5 text-text-muted hover:text-accent hover:bg-surface-2 rounded-full transition-all shrink-0"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}
