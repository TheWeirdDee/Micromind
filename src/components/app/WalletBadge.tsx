'use client';

import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { ERC20_ABI } from '@/lib/contract';
import { publicClient } from '@/lib/viem';
import { useWallet } from '@/context/WalletContext';
import { Copy, Check, ExternalLink } from 'lucide-react';

export function WalletBadge() {
  const { address, isConnected, isMiniPay, connect } = useWallet();
  const [balance, setBalance] = useState<bigint | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (address) {
      publicClient.readContract({
        address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
        abi: ERC20_ABI,
        functionName: 'balanceOf',
        args: [address as `0x${string}`],
      }).then((data) => setBalance(data as bigint));
    }
  }, [address]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isMiniPay && !isConnected) {
    return (
      <div className="flex flex-col items-end gap-2">
        <button 
          onClick={handleCopyLink}
          className="flex items-center gap-2 text-[10px] font-mono tracking-widest uppercase bg-surface border border-border text-text-muted px-4 py-2 rounded-full hover:bg-white/5 transition-colors"
        >
          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
          Open in MiniPay
        </button>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <button 
        onClick={() => connect()}
        className="text-[10px] font-mono tracking-widest uppercase bg-accent text-bg px-4 py-2 rounded-full hover:bg-white transition-colors"
      >
        Connect
      </button>
    );
  }

  const truncatedAddress = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';

  return (
    <div className="flex items-center gap-3 bg-surface border border-border px-4 py-2 rounded-full">
      <div className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
      <span className="text-[10px] font-mono text-text-primary uppercase tracking-tight">
        {truncatedAddress}
      </span>
      <span className="text-[10px] font-mono text-text-muted opacity-40">·</span>
      <span className="text-[10px] font-mono text-accent-green font-medium">
        {balance ? parseFloat(formatUnits(balance, 18)).toFixed(2) : '0.00'} cUSD
      </span>
    </div>
  );
}
