'use client';

import { WalletBadge } from './WalletBadge';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { useWallet } from '@/context/WalletContext';
import { LogOut } from 'lucide-react';

export function AppHeader() {
  const { isConnected, disconnect } = useWallet();

  const handleDisconnect = () => {
    if (window.confirm('Disconnect your wallet?')) {
      disconnect();
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[430px] mx-auto h-16 px-4 flex justify-between items-center gap-2">
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
        </div>
      </div>
    </header>
  );
}
