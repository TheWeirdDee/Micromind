'use client';
import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode
} from 'react';
import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  erc20Abi
} from 'viem';
import { celo } from 'viem/chains';
import {
  cUSD_ADDRESS,
  PAYMENT_TOKEN_DECIMALS,
  CELO_MAINNET_PARAMS,
  CHAIN_ID_HEX
} from '@/constants/chains';

interface WalletContextType {
  address: string | null;
  isConnected: boolean;
  isMiniPay: boolean;
  cusdBalance: string;
  celoBalance: string;
  walletClient: any;
  publicClient: any;
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchBalances: (addr: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export const publicClient = createPublicClient({
  chain: celo,
  transport: http('https://forno.celo.org')
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMiniPay, setIsMiniPay] = useState(false);
  const [cusdBalance, setCusdBalance] = useState('0');
  const [celoBalance, setCeloBalance] = useState('0');
  const [walletClient, setWalletClient] = useState<any>(null);

  const fetchBalances = useCallback(async (addr: string) => {
    try {
      // CELO balance
      const celoRaw = await publicClient.getBalance({
        address: addr as `0x${string}`
      });
      setCeloBalance((Number(celoRaw) / 1e18).toFixed(4));
    } catch { setCeloBalance('0'); }

    try {
      // cUSD balance (18 decimals)
      const cusdRaw = await publicClient.readContract({
        address: cUSD_ADDRESS as `0x${string}`,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [addr as `0x${string}`]
      });
      setCusdBalance(
        (Number(cusdRaw) / 10 ** PAYMENT_TOKEN_DECIMALS).toFixed(2)
      );
    } catch { setCusdBalance('0'); }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setIsConnected(false);
    setCusdBalance('0');
    setCeloBalance('0');
    setWalletClient(null);
    setIsMiniPay(false);

    try { localStorage.clear(); } catch {}
    try { sessionStorage.clear(); } catch {}

    window.location.replace('/app');
  }, []);

  // Auto-connect for MiniPay ONLY
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.ethereum) return;

    // MiniPay Hook — required for Proof of Ship 
    // "Build for MiniPay" booster
    // Detects MiniPay wallet and auto-connects
    const isMiniPay = window.ethereum?.isMiniPay === true;
    if (!isMiniPay) return;

    setIsMiniPay(true);

    window.ethereum
      .request({ method: 'eth_requestAccounts' })
      .then(async (accounts: string[]) => {
        if (!accounts?.[0]) return;
        const addr = accounts[0];
        const client = createWalletClient({
          chain: celo,
          transport: custom(window.ethereum)
        });
        setAddress(addr);
        setIsConnected(true);
        setWalletClient(client);
        await fetchBalances(addr);
      })
      .catch((e: any) => {
        console.log('MiniPay auto-connect failed:', e);
      });
  }, [fetchBalances]);

  // Listen for account/chain changes
  useEffect(() => {
    if (!window.ethereum) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        fetchBalances(accounts[0]);
      }
    };

    const onChainChanged = () => window.location.reload();

    window.ethereum.on('accountsChanged', onAccountsChanged);
    window.ethereum.on('chainChanged', onChainChanged);

    return () => {
      window.ethereum?.removeListener(
        'accountsChanged', onAccountsChanged
      );
      window.ethereum?.removeListener(
        'chainChanged', onChainChanged
      );
    };
  }, [fetchBalances, disconnect]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask or open in MiniPay');
      return;
    }

    try {
      // Force MetaMask to show account selection (optional, may fail in some wallets)
      try {
        await window.ethereum.request({
          method: 'wallet_requestPermissions',
          params: [{ eth_accounts: {} }]
        });
      } catch (err) {
        console.log('Permissions request skipped or failed:', err);
      }

      const accounts: string[] = await window.ethereum.request({
        method: 'eth_requestAccounts'
      });

      if (!accounts?.[0]) return;

      // Switch to Celo Mainnet
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: CHAIN_ID_HEX }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [CELO_MAINNET_PARAMS]
          });
        }
      }

      const addr = accounts[0];
      const client = createWalletClient({
        chain: celo,
        transport: custom(window.ethereum)
      });

      setAddress(addr);
      setIsConnected(true);
      setIsMiniPay(window.ethereum?.isMiniPay === true);
      setWalletClient(client);

      await fetchBalances(addr);

      // Suggest USDC token to MetaMask
      try {
        await window.ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: cUSD_ADDRESS,
              symbol: 'cUSD',
              decimals: 18,
            }
          }
        });
      } catch { /* non-critical */ }

    } catch (e: any) {
      if (e.code !== 4001) {
        console.error('Connect failed:', e?.message || e);
      }
    }
  }, [fetchBalances]);

  return (
    <WalletContext.Provider value={{
      address,
      isConnected,
      isMiniPay,
      cusdBalance,
      celoBalance,
      walletClient,
      publicClient,
      connect,
      disconnect,
      fetchBalances
    }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be inside WalletProvider');
  return ctx;
}
