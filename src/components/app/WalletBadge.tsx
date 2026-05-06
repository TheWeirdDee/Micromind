'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { Copy, Check } from 'lucide-react';

export function WalletBadge() {
  const { address, cUSDBalance, celoBalance, isConnected, connect } = useWallet();
  const [copied, setCopied] = useState(false);
  const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button 
        onClick={() => connect()}
        className="text-[10px] font-mono tracking-widest uppercase bg-accent text-bg px-4 py-2 rounded-full hover:bg-white transition-colors"
      >
        Connect Wallet
      </button>
    );
  }

  const truncatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div 
      onClick={handleCopyAddress}
      className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/5 transition-colors group max-w-[200px] sm:max-w-none"
    >
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] font-mono text-text-primary uppercase tracking-tight">
          {truncatedAddress}
        </span>
        {copied ? <Check className="w-2.5 h-2.5 text-accent-green" /> : <Copy className="w-2.5 h-2.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      
      <div className="hidden xs:flex items-center gap-2">
        <span className="text-[10px] font-mono text-text-muted opacity-40">·</span>
        <span className="text-[10px] font-mono text-accent-green font-medium whitespace-nowrap">
          {celoBalance} <span className="text-[8px] opacity-70">CELO</span>
        </span>
      </div>
      
      <div className={`text-[8px] font-mono px-1.5 py-0.5 rounded border flex-shrink-0 ${
        IS_TESTNET ? 'border-yellow-500/50 text-yellow-500 bg-yellow-500/10' : 'border-accent-green/50 text-accent-green bg-accent-green/10'
      }`}>
        {IS_TESTNET ? 'SEPOLIA' : 'MAINNET'}
      </div>
    </div>
  );
}
