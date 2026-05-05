'use client';

import { useAccount, useReadContract, useConnect, useConnectors } from 'wagmi';
import { celo } from 'wagmi/chains';
import { formatUnits } from 'viem';
import { useState } from 'react';
import { ERC20_ABI } from '@/lib/contract';

export function WalletBadge() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [copied, setCopied] = useState(false);

  // cUSD Balance using useReadContract
  const { data: balance } = useReadContract({
    address: '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`,
    abi: ERC20_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  const handleCopy = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isConnected) {
    return (
      <button 
        onClick={() => connect({ connector: connectors[0] })}
        className="text-[10px] font-mono tracking-widest uppercase bg-accent text-bg px-4 py-1.5 rounded-full hover:bg-white transition-colors"
      >
        Connect
      </button>
    );
  }

  return (
    <button 
      onClick={handleCopy}
      className="flex items-center gap-2 bg-surface border border-border px-3 py-1.5 rounded-full hover:border-text-muted transition-colors group"
    >
      <span className="text-[10px] font-mono text-text-muted group-hover:text-text-primary transition-colors">
        {copied ? 'Copied' : `${address?.slice(0, 6)}...${address?.slice(-4)}`}
      </span>
      <span className="text-[10px] font-mono text-text-muted opacity-40">·</span>
      <span className="text-[10px] font-mono text-accent-green font-medium">
        {balance ? parseFloat(formatUnits(balance as bigint, 18)).toFixed(2) : '0.00'} cUSD
      </span>
    </button>
  );
}
