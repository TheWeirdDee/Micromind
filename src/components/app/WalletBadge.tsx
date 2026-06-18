'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { ConnectWalletModal } from './ConnectWalletModal';
import { Copy, Check } from 'lucide-react';

export function WalletBadge() {
  const { address, cusdBalance, celoBalance, isConnected } = useWallet();
  const [copied, setCopied] = useState(false);
  const [showConnect, setShowConnect] = useState(false);

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <>
        <button 
          onClick={() => setShowConnect(true)}
          className="text-[10px] font-mono tracking-widest uppercase bg-accent text-bg px-4 py-2 rounded-full hover:bg-white transition-colors"
        >
          Connect Wallet
        </button>
        <ConnectWalletModal isOpen={showConnect} onClose={() => setShowConnect(false)} />
      </>
    );
  }

  const truncatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div 
      onClick={handleCopyAddress}
      title={address ?? ''}
      aria-label={`Wallet address: ${address}. Click to copy.`}
      className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-full cursor-pointer hover:bg-white/5 transition-colors group max-w-[200px] sm:max-w-none"
    >
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <span className="text-[10px] font-mono text-text-primary uppercase tracking-tight">
          {truncatedAddress}
        </span>
        {copied ? <Check className="w-2.5 h-2.5 text-accent-green" /> : <Copy className="w-2.5 h-2.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />}
      </div>
      
      <div
        aria-label={`cUSD balance: ${Number(cusdBalance).toFixed(2)}`}
        className="text-[9px] font-mono px-2 py-0.5 rounded border flex-shrink-0 border-[#35D07F]/50 text-[#35D07F] bg-[#35D07F]/10 whitespace-nowrap"
      >
        {Number(cusdBalance).toFixed(2)} cUSD
      </div>
      <div
        aria-label={`CELO balance: ${Number(celoBalance).toFixed(4)}`}
        className="text-[9px] font-mono px-2 py-0.5 rounded border flex-shrink-0 border-yellow-400/40 text-yellow-400 bg-yellow-400/10 whitespace-nowrap hidden sm:block"
      >
        {Number(celoBalance).toFixed(3)} CELO
      </div>
    </div>
  );
}
