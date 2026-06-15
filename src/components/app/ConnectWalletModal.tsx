'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
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
  icon?: string | null;
}

export function ConnectWalletModal({ isOpen, onClose }: ConnectWalletModalProps) {
  const { isConnected, connect } = useWallet();
  const [walletOptions, setWalletOptions] = useState<WalletOption[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isConnected && isOpen) onClose();
  }, [isConnected, isOpen, onClose]);

  // Use EIP-6963 for reliable wallet detection (MetaMask, Zerion etc each announce themselves)
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const discovered: Map<string, WalletOption> = new Map();

    const handleAnnounce = (event: any) => {
      const { info, provider } = event.detail ?? {};
      if (!info?.uuid || !provider) return;
      if (discovered.has(info.uuid)) return;
      discovered.set(info.uuid, {
        name: info.name ?? 'Browser Wallet',
        provider,
        icon: info.icon ?? null,
      });
      setWalletOptions([...discovered.values()]);
    };

    window.addEventListener('eip6963:announceProvider', handleAnnounce);
    // Ask all installed wallets to announce themselves
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    // Fallback for wallets that don't support EIP-6963 (older MetaMask, Trust, etc.)
    const fallbackTimer = setTimeout(() => {
      if (discovered.size === 0) {
        const win = window as any;
        if (win.ethereum) {
          const providers: any[] = Array.isArray(win.ethereum.providers)
            ? win.ethereum.providers
            : [win.ethereum];
          const options: WalletOption[] = providers.map((p: any) => {
            let name = 'Browser Wallet';
            if (p.isCoinbaseWallet) name = 'Coinbase Wallet';
            else if (p.isTrust) name = 'Trust Wallet';
            else if (p.isBraveWallet) name = 'Brave Wallet';
            else if (p.isMetaMask) name = 'MetaMask';
            return { name, provider: p, icon: null };
          });
          // dedupe by name
          const seen = new Set<string>();
          const deduped = options.filter(o => {
            if (seen.has(o.name)) return false;
            seen.add(o.name);
            return true;
          });
          setWalletOptions(deduped);
        }
      }
    }, 200);

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce);
      clearTimeout(fallbackTimer);
    };
  }, [isOpen]);

  const modal = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

          {/* Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: 'spring', duration: 0.45 }}
            className="relative w-full max-w-[380px] bg-[#111] border border-white/10 rounded-[2.5rem] shadow-2xl flex flex-col z-10 max-h-[90vh] overflow-y-auto"
          >
            <div className="absolute inset-0 halftone-bg opacity-5 pointer-events-none rounded-[2.5rem]" />

            <div className="relative p-7">
              {/* Close */}
              <button
                onClick={onClose}
                className="absolute top-5 right-5 p-2 text-white/40 hover:text-white rounded-full hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Icon */}
              <div className="mx-auto w-12 h-12 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center mb-5">
                <Wallet className="w-6 h-6 text-accent" />
              </div>

              {/* Heading */}
              <div className="text-center space-y-3 mb-6">
                <h3 className="text-2xl font-serif text-white leading-tight">Connect Wallet</h3>
                <p className="font-mono text-xs text-white/50 leading-relaxed">
                  To unlock paid AI features, connect your wallet. Payments are processed in cUSD via tiny micro-transactions on the Celo network.
                </p>
                <div className="p-3 bg-yellow-500/5 border border-yellow-500/20 rounded-2xl text-[10px] text-yellow-400/80 font-mono leading-relaxed text-center">
                  <AlertCircle className="w-3.5 h-3.5 inline-block mr-1.5 align-middle" />
                  You will also need a minuscule amount of CELO (~0.001 CELO) in your wallet to cover transaction gas fees.
                </div>
              </div>

              {/* Wallet list */}
              {walletOptions.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-white/30 font-mono mb-3">Choose your wallet</p>
                  {walletOptions.map((option) => (
                    <button
                      key={option.name}
                      onClick={() => connect(option.provider)}
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-left transition-all duration-200 hover:border-accent hover:bg-accent/5 active:scale-[0.98] focus:outline-none flex items-center gap-3"
                    >
                      {option.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={option.icon} alt={option.name} className="w-8 h-8 rounded-xl flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex-shrink-0" />
                      )}
                      <div>
                        <span className="block font-mono font-semibold text-sm text-white">{option.name}</span>
                        <span className="text-[10px] text-white/30 font-mono">Use this wallet for Celo payments</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 text-center">
                  <p className="font-mono text-xs text-white/40 leading-relaxed">
                    No wallet detected. Install MetaMask to continue.
                  </p>
                  <a
                    href="https://metamask.io/download/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pill-button pill-button-primary w-full py-4 text-xs font-mono uppercase tracking-widest font-bold inline-flex items-center justify-center gap-2 focus:outline-none"
                  >
                    Install MetaMask <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (!mounted) return null;
  return createPortal(modal, document.body);
}
