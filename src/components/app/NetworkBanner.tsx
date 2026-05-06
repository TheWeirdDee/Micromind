'use client';

import { useState } from 'react';
import { useWallet } from '@/context/WalletContext';
import { X } from 'lucide-react';

export function NetworkBanner() {
  const { isTestingMode } = useWallet();
  const [dismissed, setDismissed] = useState(false);
  const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

  if (!isTestingMode || dismissed) return null;

  return (
    <div className="bg-[#1C1A0E] border-b border-[#854D0E] px-4 py-2 flex items-center justify-between relative z-50">
      <div className="flex-1 text-center">
        <p className="font-mono text-[11px] text-[#FEF08A]">
          🧪 Desktop testing · MetaMask · {IS_TESTNET ? 'Celo Sepolia' : 'Celo Mainnet'}
        </p>
      </div>
      <button 
        onClick={() => setDismissed(true)}
        className="text-[#FEF08A] hover:opacity-70 transition-opacity ml-2"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
