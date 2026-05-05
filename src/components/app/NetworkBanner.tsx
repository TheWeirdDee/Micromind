'use client';

import { useWallet } from '@/context/WalletContext';
import { AlertCircle } from 'lucide-react';

export function NetworkBanner() {
  const { isConnected, isCelo } = useWallet();

  if (!isConnected || isCelo) return null;

  return (
    <div className="bg-accent-gold/10 border-b border-accent-gold/20 px-6 py-3 flex items-center gap-3 animate-fade-up">
      <AlertCircle className="w-4 h-4 text-accent-gold" />
      <p className="font-mono text-[10px] text-accent-gold uppercase tracking-widest leading-tight">
        Please switch to Celo network or open in MiniPay.
      </p>
    </div>
  );
}
