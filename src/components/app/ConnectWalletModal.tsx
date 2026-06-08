'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, AlertCircle } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletOption {
  name: string;
  provider: any;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { isConnected, connect } = useWallet();
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);

  const getProviderName = (provider: any) => {
    if (!provider) return 'Injected Wallet';
    if (provider.isMetaMask) return 'MetaMask';
    if (provider.isCoinbaseWallet) return 'Coinbase Wallet';
    if (provider.isFrame) return 'Frame';
    if (provider.isTrust) return 'Trust Wallet';
    if (provider.isZerion) return 'Zerion';
    if (provider.isWalletLink) return 'WalletLink';
    return 'Injected Wallet';
  };

  // Auto-close when wallet connects successfully
  useEffect(() => {
    if (isConnected && isOpen) {
      onClose();
    }
  }, [isConnected, isOpen, onClose]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const win = window as any;
    const providers = win.ethereum?.providers;

    if (providers && Array.isArray(providers) && providers.length > 0) {
      const options: WalletOption[] = providers.map((provider: any) => ({
        name: getProviderName(provider),
        provider
      }));
      setWalletOptions(options);
    } else if (win.ethereum) {
      setWalletOptions([{ name: getProviderName(win.ethereum), provider: win.ethereum }]);
    } else {
      setWalletOptions([]);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          {/* Backdrop Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-bg/75 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="relative w-full max-w-[360px] bg-surface/90 border border-border p-6 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col z-10"
          >
            {/* Halftone Pattern background */}
            <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-2 transition-colors focus:outline-none"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Wallet Icon Accent */}
            <div className="mx-auto w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mb-6 mt-2">
              <Wallet className="w-6 h-6 text-accent" />
            </div>

            {/* Content */}
            <div className="text-center space-y-4 mb-8">
              <h3 className="text-2xl font-serif text-text-primary leading-tight">
                Connect Wallet
              </h3>
              <p className="font-mono text-xs text-text-muted leading-relaxed max-w-[30rem] mx-auto">
                To unlock paid AI features, you need to connect your wallet. Payments are processed in cUSD via tiny micro-transactions on the Celo network.
              </p>

              {/* Gas Info Alert */}
              <div className="p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-2xl flex flex-col items-center gap-2 text-[10px] text-accent-gold font-mono text-center leading-relaxed max-w-[28rem] mx-auto">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>You will also need a minuscule amount of CELO (~0.001 CELO) in your wallet to cover transaction gas fees.</span>
              </div>
            </div>

            {walletOptions.length > 0 ? (
              <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono text-left">Choose your wallet</p>
                {walletOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => connect(option.provider)}
                    className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-4 text-left text-sm font-mono transition hover:border-accent"
                  >
                    <span className="block font-semibold text-text-primary">{option.name}</span>
                    <span className="text-[10px] text-text-muted">Use this wallet provider for Celo payments</span>
                  </button>
                ))}
              </div>
            ) : (
              <button
                onClick={() => connect()}
                className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold shadow-xl shadow-accent/5 focus:outline-none"
              >
                Connect Celo Wallet
              </button>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
