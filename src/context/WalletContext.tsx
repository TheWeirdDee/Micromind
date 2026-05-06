'use client';

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { createWalletClient, custom, type WalletClient, erc20Abi, formatEther } from 'viem';
import { celo, celoSepolia } from 'viem/chains';
import { publicClient } from '@/lib/viem';

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';
const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a' as `0x${string}`;

const NETWORKS = {
  testnet: {
    chainId: '0xAA1480',
    chainName: 'Celo Sepolia Testnet',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: ['https://forno.celo-sepolia.celo-testnet.org'],
    blockExplorerUrls: ['https://sepolia.celoscan.io']
  },
  mainnet: {
    chainId: '0xA4EC',
    chainName: 'Celo Mainnet',
    nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
    rpcUrls: ['https://forno.celo.org'],
    blockExplorerUrls: ['https://celoscan.io']
  }
};

const target = IS_TESTNET ? NETWORKS.testnet : NETWORKS.mainnet;

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
  const [chainId, setChainId] = useState<number | null>(null);

  const fetchBalances = useCallback(async (addr: string) => {
    try {
      // cUSD balance
      const cUSDRaw = await publicClient.readContract({
        address: CUSD_ADDRESS,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [addr as `0x${string}`]
      });
      setCUSDBalance((Number(cUSDRaw) / 1e18).toFixed(4));

      // CELO balance (native)
      const celoRaw = await publicClient.getBalance({ address: addr as `0x${string}` });
      setCeloBalance((Number(celoRaw) / 1e18).toFixed(4));
    } catch (error) {
      console.error('Error fetching balances:', error);
    }
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !window.ethereum) {
      alert('Please install MetaMask or use MiniPay');
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: target.chainId }]
        });
      } catch (e: any) {
        if (e.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [target]
          });
        }
      }

      const client = createWalletClient({
        chain: IS_TESTNET ? celoSepolia : celo,
        transport: custom(window.ethereum)
      });

      setAddress(accounts[0]);
      setWalletClient(client);
      fetchBalances(accounts[0]);
      
      const id = await window.ethereum.request({ method: 'eth_chainId' });
      setChainId(parseInt(id, 16));
    } catch (error) {
      console.error('Connection failed:', error);
    }
  }, [fetchBalances]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      const isMP = window.ethereum.isMiniPay === true;
      setIsMiniPay(isMP);

      if (isMP) {
        // Silent auto-connect for MiniPay
        window.ethereum.request({ method: 'eth_accounts' }).then((accounts: string[]) => {
          if (accounts.length > 0) {
            const client = createWalletClient({
              chain: IS_TESTNET ? celoSepolia : celo,
              transport: custom(window.ethereum)
            });
            setAddress(accounts[0]);
            setWalletClient(client);
            fetchBalances(accounts[0]);
          }
        });
      }

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
    if (address && chainId && chainId !== parseInt(target.chainId, 16)) {
      const enforceNetwork = async () => {
        try {
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: target.chainId }]
          });
        } catch (e: any) {
          if (e.code === 4902) {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [target]
            });
          }
        }
      };
      enforceNetwork();
    }
  }, [address, chainId]);

  const disconnect = useCallback(() => {
    setAddress(null);
    setWalletClient(null);
    setCUSDBalance('0.0000');
    setCeloBalance('0.0000');
  }, []);

  return (
    <WalletContext.Provider value={{ 
      address, 
      cUSDBalance,
      celoBalance,
      isConnected: !!address, 
      isMiniPay,
      isTestingMode: !!address && !isMiniPay,
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
