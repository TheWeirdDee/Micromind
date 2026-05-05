'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createWalletClient, custom, type WalletClient } from 'viem';
import { celo } from 'viem/chains';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isMiniPay: boolean;
  isCelo: boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
  walletClient: WalletClient | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  useEffect(() => {
    const detectMiniPay = () => {
      // @ts-ignore
      const isMP = typeof window !== 'undefined' && window.ethereum?.isMiniPay === true;
      setIsMiniPay(isMP);
      return isMP;
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      // @ts-ignore
      window.ethereum.request({ method: 'eth_chainId' }).then((id: string) => {
        setChainId(parseInt(id, 16));
      });

      if (detectMiniPay()) {
        // @ts-ignore
        window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
          if (accounts.length > 0) {
            const client = createWalletClient({
              chain: celo,
              // @ts-ignore
              transport: custom(window.ethereum)
            });
            setAddress(accounts[0]);
            setWalletClient(client);
          }
        });
      }

      // @ts-ignore
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAddress(accounts[0] || null);
      });

      // @ts-ignore
      window.ethereum.on('chainChanged', (id: string) => {
        setChainId(parseInt(id, 16));
      });
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      return;
    }

    // @ts-ignore
    const isMP = window.ethereum?.isMiniPay === true;

    if (isMP) {
      try {
        // @ts-ignore
        const accounts = await window.ethereum.request({ 
          method: 'eth_requestAccounts' 
        });
        const client = createWalletClient({
          chain: celo,
          // @ts-ignore
          transport: custom(window.ethereum)
        });
        setAddress(accounts[0]);
        setWalletClient(client);
      } catch (error) {
        console.error('MiniPay connection failed', error);
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
  }, []);

  return (
    <WalletContext.Provider value={{ 
      address, 
      isConnected: !!address, 
      isMiniPay,
      isCelo: chainId === 42220,
      connect,
      disconnect,
      walletClient 
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
