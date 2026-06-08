'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wallet, X, AlertCircle, ExternalLink } from 'lucide-react';
import { useWallet } from '@/context/WalletContext';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface WalletOption {
  name: string;
  provider: any;
  subtitle: string;
}

function detectWalletOptions(): WalletOption[] {
  if (typeof window === 'undefined') return [];
  const win = window as any;
  const ethereum = win.ethereum;
  if (!ethereum) return [];

  const getName = (p: any) => {
    if (p.isMetaMask && !p.isZerion && !p.isCoinbaseWallet) return 'MetaMask';
    if (p.isCoinbaseWallet || p.isCoinbaseBrowser) return 'Coinbase Wallet';
    if (p.isTrust) return 'Trust Wallet';
    if (p.isFrame) return 'Frame';
    if (p.isZerion) return 'Zerion';
    if (p.isRabby) return 'Rabby';
    if (p.isBraveWallet) return 'Brave Wallet';
    if (p.isMetaMask) return 'MetaMask';
    return 'Browser Wallet';
  };

  const seen = new Set<string>();
  const options: WalletOption[] = [];

  const providers: any[] = Array.isArray(ethereum.providers) ? ethereum.providers : [ethereum];
  for (const p of providers) {
    const name = getName(p);
    if (seen.has(name)) continue;
    seen.add(name);
    options.push({ name, provider: p, subtitle: 'Use this wallet for Celo payments' });
  }

  return options;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { isConnected, connect } = useWallet();
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);

  useEffect(() => {
    if (isConnected && isOpen) onClose();
  }, [isConnected, isOpen, onClose]);

  useEffect(() => {
    if (isOpen) setWalletOptions(detectWalletOptions());
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
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
            className="relative w-full max-w-[380px] bg-surface/90 border border-border rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col z-10 max-h-[90vh]"
          >
            <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none" />

            {/* Scrollable content */}
            <div className="relative overflow-y-auto flex-1 p-6">
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 text-text-muted hover:text-text-primary rounded-full hover:bg-surface-2 transition-colors focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="mx-auto w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mb-5 mt-2">
                <Wallet className="w-6 h-6 text-accent" />
              </div>

              {/* Heading */}
              <div className="text-center space-y-3 mb-6">
                <h3 className="text-2xl font-serif text-text-primary leading-tight">Connect Wallet</h3>
                <p className="font-mono text-xs text-text-muted leading-relaxed">
                  To unlock paid AI features, connect your wallet. Payments are processed in cUSD via tiny micro-transactions on the Celo network.
                </p>

                {/* Gas alert */}
                <div className="p-3 bg-accent-gold/5 border border-accent-gold/20 rounded-2xl text-[10px] text-accent-gold font-mono leading-relaxed text-center">
                  <AlertCircle className="w-3.5 h-3.5 inline-block mr-1.5 align-middle" />
                  You will also need a minuscule amount of CELO (~0.001 CELO) in your wallet to cover transaction gas fees.
                </div>
              </div>

              {/* Wallet list */}
              {walletOptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">Choose your wallet</p>
                  {walletOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => connect(option.provider)}
                      className="w-full rounded-2xl border border-border bg-surface-2 px-4 py-4 text-left text-sm font-mono transition hover:border-accent focus:outline-none"
                    >
                      <span className="block font-semibold text-text-primary">{option.name}</span>
                      <span className="text-[10px] text-text-muted">{option.subtitle}</span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-text-muted font-mono">No wallet detected</p>
                  <p className="font-mono text-xs text-text-muted leading-relaxed">
                    Install MetaMask or another browser wallet to continue.
                  </p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold inline-flex items-center justify-center gap-2 focus:outline-none"
                  >
                    Install MetaMask
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
