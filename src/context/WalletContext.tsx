'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { http, createConfig, WagmiProvider } from 'wagmi';
import { celo } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const config = createConfig({
  chains: [celo],
  transports: {
    [celo.id]: http(),
  },
});

const queryClient = new QueryClient();

interface WalletContextType {
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  connect: () => Promise<void>;
  isCelo: boolean;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const checkNetwork = useCallback(async () => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(currentChainId, 16));
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        setAddress(accounts[0] || null);
      });
      window.ethereum.on('chainChanged', (hexChainId: string) => {
        setChainId(parseInt(hexChainId, 16));
      });
      
      // Initial check
      window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
        setAddress(accounts[0] || null);
      });
      checkNetwork();
    }
  }, [checkNetwork]);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please open MicroMind inside the MiniPay app');
      return;
    }
    
    try {
      // Works with MiniPay (phone) AND MetaMask (desktop testing)
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });
      
      // Force Celo network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0xA4EC' }] // 42220 in hex = Celo Mainnet
        });
      } catch (e) {
        // MiniPay doesn't need this — it's already on Celo
        console.log('Switch network skipped or failed', e);
      }
      
      setAddress(accounts[0]);
      await checkNetwork();
    } catch (error) {
      console.error('Connection failed', error);
    }
  }, [checkNetwork]);

  const isCelo = chainId === 42220;

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <WalletContext.Provider value={{ address, chainId, isConnected: !!address, connect, isCelo }}>
          {children}
        </WalletContext.Provider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within WalletProvider');
  return context;
};
