'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createWalletClient, custom, type WalletClient, erc20Abi, formatEther } from 'viem';
import { celo, celoSepolia } from 'viem/chains';
import { publicClient } from '@/lib/viem';

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
const CUSD_ADDRESS = (process.env.NEXT_PUBLIC_CUSD_ADDRESS || '0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1') as `0x${string}`;

const CELO_MAINNET_PARAMS = {
  chainId: '0xA4EC',
  chainName: 'Celo Mainnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://celoscan.io']
};

const CELO_SEPOLIA_PARAMS = {
  chainId: '0xAEF3',
  chainName: 'Celo Sepolia Testnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://celo-sepolia.drpc.org'],
  blockExplorerUrls: ['https://celo-sepolia.blockscout.com']
};

const TARGET_PARAMS = IS_TESTNET ? CELO_SEPOLIA_PARAMS : CELO_MAINNET_PARAMS;

interface WalletContextType {
  address: string | null;
  cUSDBalance: string;
  celoBalance: string;
  isConnected: boolean;
  isMiniPay: boolean;
  isTestingMode: boolean;
  chainId: number | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  walletClient: WalletClient | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [walletClient, setWalletClient] = useState<WalletClient | null>(null);
  const [cUSDBalance, setCUSDBalance] = useState('0.0000');
  const [celoBalance, setCeloBalance] = useState('0.0000');
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [isTestingMode, setIsTestingMode] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);

  const fetchBalances = useCallback(async (addr: string) => {
    try {
      const raw = await publicClient.getBalance({
        address: addr as `0x${string}`
      });
      const celoValue = (Number(raw) / 1e18).toFixed(4);
      setCeloBalance(celoValue);
      setCUSDBalance(celoValue); // reuse for display
    } catch (e) {
      setCeloBalance('0');
      setCUSDBalance('0');
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or open in MiniPay');
      return;
    }
    
    try {
      // Force MetaMask to show popup even if already connected
      await window.ethereum.request({
        method: 'wallet_requestPermissions',
        params: [{ eth_accounts: {} }]
      });
      
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts returned');
      }
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: TARGET_PARAMS.chainId }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [TARGET_PARAMS]
          });
        }
      }
      
      const addr = accounts[0];
      const client = createWalletClient({
        chain: IS_TESTNET ? celoSepolia : celo,
        transport: custom(window.ethereum)
      });

      setAddress(addr);
      setWalletClient(client);
      setIsTestingMode(!window.ethereum?.isMiniPay);
      
      await fetchBalances(addr);
      
      const id = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(id, 16));
    } catch (e: any) {
      if (e.code === 4001) {
        console.log('User rejected connection');
      } else {
        console.error('Connect failed:', e);
      }
    }
  }, [fetchBalances]);

  const disconnect = useCallback(() => {
    // Clear all wallet state
    setAddress(null);
    setCeloBalance('0');
    setCUSDBalance('0');
    setWalletClient(null);
    setIsTestingMode(false);
    setChainId(null);
    
    // Clear ALL localStorage keys that could cache connection
    const keysToRemove = [
      'micromind_connected',
      'micromind_address',
      'micromind_user_disconnected',
      'wagmi.connected',
      'wagmi.wallet',
      'wagmi.store',
      'wc@2:client:0.3//session',
      'WALLETCONNECT_DEEPLINK_CHOICE',
    ];
    keysToRemove.forEach(key => {
      try { localStorage.removeItem(key); } catch {}
    });
    
    // Navigate to /app (not back) so user sees connect screen
    window.location.href = '/app';
  }, []);

  useEffect(() => {
    const autoConnect = async () => {
      if (typeof window === 'undefined' || !window.ethereum) return;
      
      const isMP = window.ethereum.isMiniPay === true;
      setIsMiniPay(isMP);

      if (isMP) {
        try {
          const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
          });
          if (accounts[0]) {
            const addr = accounts[0];
            const client = createWalletClient({
              chain: IS_TESTNET ? celoSepolia : celo,
              transport: custom(window.ethereum)
            });
            setAddress(addr);
            setWalletClient(client);
            setIsTestingMode(false);
            await fetchBalances(addr);
            
            const id = await window.ethereum.request({ method: 'eth_chainId' });
            setChainId(parseInt(id, 16));
          }
        } catch (e) {
          console.log('MiniPay auto-connect failed:', e);
        }
      }
    };
    
    autoConnect();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length > 0) {
          setAddress(accounts[0]);
          fetchBalances(accounts[0]);
        } else {
          setAddress(null);
          setWalletClient(null);
        }
      });

      window.ethereum.on('chainChanged', (id: string) => {
        setChainId(parseInt(id, 16));
      });
    }
  }, [fetchBalances]);

  // Network enforcement effect
  useEffect(() => {
    if (address && chainId && chainId !== parseInt(TARGET_PARAMS.chainId, 16)) {
      const enforceNetwork = async () => {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: TARGET_PARAMS.chainId }]
          });
        } catch (e: any) {
          if (e.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [TARGET_PARAMS]
            });
          }
        }
      };
      enforceNetwork();
    }
  }, [address, chainId]);

  return (
    <WalletContext.Provider value={{ 
      address, 
      cUSDBalance,
      celoBalance,
      isConnected: !!address, 
      isMiniPay,
      isTestingMode,
      chainId,
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
