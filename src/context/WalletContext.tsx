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
  erc20Abi,
  getAddress
} from 'viem';
import { celo } from 'viem/chains';
import {
  cUSD_ADDRESS,
  PAYMENT_TOKEN_DECIMALS,
  CELO_MAINNET_PARAMS,
  CHAIN_ID_HEX
} from '@/constants/chains';
import type { EthereumProvider } from '@/lib/viem';

/** Shape of the global wallet context shared across the app. */
interface WalletContextType {
  /** Checksummed EIP-55 address of the connected wallet, or null if not connected. */
  address: string | null;
  /** True when a wallet is connected and an address is available. */
  isConnected: boolean;
  /** True when the app is running inside the Opera MiniPay wallet browser. */
  isMiniPay: boolean;
  /** Human-readable cUSD balance of the connected address (2 decimal places). */
  cusdBalance: string;
  /** Human-readable CELO balance of the connected address (4 decimal places). */
  celoBalance: string;
  /** Viem WalletClient instance for signing and sending transactions. */
  walletClient: ReturnType<typeof createWalletClient> | null;
  /** Viem PublicClient instance for reading chain state (balances, receipts). */
  publicClient: ReturnType<typeof createPublicClient>;
  /** Prompts the user to connect a wallet. Accepts an optional injected provider. */
  connect: (provider?: EthereumProvider) => Promise<void>;
  /** Clears wallet state and redirects to /app. */
  disconnect: () => void;
  /** Fetches and updates cUSD + CELO balances for a given address. */
  fetchBalances: (addr: string) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

// Prefer MetaMask over Zerion/other injected wallets when multiple providers are present.
// MiniPay always wins. Returns null if nothing is available.
function getPreferredProvider(): EthereumProvider | null {
  if (typeof window === 'undefined') return null;
  const eth = window.ethereum;
  if (!eth) return null;
  if (eth.isMiniPay) return eth;
  if (eth.providers && Array.isArray(eth.providers)) {
    const ps = eth.providers;
    return (
      ps.find(p => p.isMetaMask && !(p as { isZerion?: boolean }).isZerion) ||
      ps.find(p => p.isMetaMask) ||
      ps[0] ||
      eth
    );
  }
  return eth;
}

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
  const [walletClient, setWalletClient] = useState<ReturnType<typeof createWalletClient> | null>(null);

  const fetchBalances = useCallback(async (addr: string) => {
    try {
      const celoRaw = await publicClient.getBalance({
        address: addr as `0x${string}`
      });
      setCeloBalance((Number(celoRaw) / 1e18).toFixed(4));
    } catch { setCeloBalance('0'); }

    try {
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

    try { localStorage.removeItem('micromind_address'); } catch {}
    try { localStorage.removeItem('micromind_connected'); } catch {}
    // Prevent auto-connect loop from immediately reconnecting after disconnect
    try { sessionStorage.setItem('mm_wallet_disconnected', '1'); } catch {}

    window.location.replace('/app');
  }, []);

  // Hydrate from localStorage to prevent flash of disconnected state
  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Don't restore session if user explicitly disconnected this tab
    if (sessionStorage.getItem('mm_wallet_disconnected')) return;

    const storedAddress = localStorage.getItem('micromind_address');
    const storedConnected = localStorage.getItem('micromind_connected');

    if (storedAddress && storedConnected === 'true') {
      setTimeout(() => {
        try {
          const checksummed = getAddress(storedAddress);
          setAddress(checksummed);
          setIsConnected(true);
          fetchBalances(checksummed);
        } catch {
          setAddress(storedAddress);
          setIsConnected(true);
          fetchBalances(storedAddress);
        }

        // Initialize wallet client early using the preferred provider
        const provider = getPreferredProvider();
        if (provider) {
          const client = createWalletClient({
            chain: celo,
            transport: custom(provider)
          });
          setWalletClient(client);
          if (provider.isMiniPay) setIsMiniPay(true);
        }
      }, 0);
    }
  }, [fetchBalances]);

  // Auto-connect and robust late-injection handling
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let attempts = 0;

    const checkAndConnect = async () => {
      // User explicitly disconnected — do not auto-reconnect
      if (sessionStorage.getItem('mm_wallet_disconnected')) {
        clearInterval(checkInterval);
        return;
      }

      attempts++;

      const ethereum = getPreferredProvider();
      if (ethereum) {
        const isMiniPayDetected = ethereum.isMiniPay === true;

        try {
          const method = isMiniPayDetected ? 'eth_requestAccounts' : 'eth_accounts';
          const accounts = await ethereum.request({ method }) as string[];

          if (accounts && accounts.length > 0) {
            const addr = getAddress(accounts[0]);
            const client = createWalletClient({
              chain: celo,
              transport: custom(ethereum)
            });
            if (isMiniPayDetected) setIsMiniPay(true);
            setAddress(addr);
            setIsConnected(true);
            setWalletClient(client);
            await fetchBalances(addr);
            
            try { localStorage.setItem('micromind_address', addr); } catch {}
            try { localStorage.setItem('micromind_connected', 'true'); } catch {}
            
            clearInterval(checkInterval);
            return; // Success
          }
        } catch (e) {
          console.log('Auto-connect failed:', e);
        }
        
        // If we found ethereum but accounts are empty, we can stop polling unless it's very early
        if (attempts > 5) clearInterval(checkInterval);
      } else {
        if (attempts > 30) clearInterval(checkInterval);
      }
    };

    const checkInterval = setInterval(checkAndConnect, 100);
    checkAndConnect();

    // Also fire immediately when the DOM reaches interactive/complete state,
    // catching late-injected window.ethereum on some Android webviews.
    const onReadyStateChange = () => {
      if (document.readyState === 'interactive' || document.readyState === 'complete') {
        checkAndConnect();
      }
    };
    document.addEventListener('readystatechange', onReadyStateChange);

    return () => {
      clearInterval(checkInterval);
      document.removeEventListener('readystatechange', onReadyStateChange);
    };
  }, [fetchBalances]);

  // Listen for account/chain changes on the preferred provider
  useEffect(() => {
    const ethereum = getPreferredProvider();
    if (!ethereum) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        try {
          const checksummed = getAddress(accounts[0]);
          setAddress(checksummed);
          fetchBalances(checksummed);
        } catch {
          setAddress(accounts[0]);
          fetchBalances(accounts[0]);
        }
      }
    };

    const onChainChanged = () => window.location.reload();

    ethereum.on('accountsChanged', onAccountsChanged);
    ethereum.on('chainChanged', onChainChanged);

    return () => {
      ethereum.removeListener?.('accountsChanged', onAccountsChanged);
      ethereum.removeListener?.('chainChanged', onChainChanged);
    };
  }, [fetchBalances, disconnect]);

  const connect = useCallback(async (provider?: EthereumProvider) => {
    // Clear disconnect flag so auto-connect can resume for future sessions
    try { sessionStorage.removeItem('mm_wallet_disconnected'); } catch {}

    let ethereum: EthereumProvider | undefined = provider || window.ethereum;

    if (!ethereum) {
      alert('Please install MetaMask or open in MiniPay');
      return;
    }

    if (!provider && ethereum.providers && Array.isArray(ethereum.providers)) {
      const metaMaskProvider = ethereum.providers.find(item => item.isMetaMask);
      ethereum = metaMaskProvider || ethereum.providers[0] || ethereum;
    }

    try {
      if (ethereum.isMetaMask) {
        try {
          await ethereum.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (err) {
          console.log('Permissions request skipped or failed:', err);
        }
      }

      const accounts = await ethereum.request({ method: 'eth_requestAccounts' }) as string[];

      if (!accounts?.[0]) return;

      const isMiniPayDetected = ethereum.isMiniPay === true;
      if (!isMiniPayDetected) {
        try {
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: CHAIN_ID_HEX }]
          });
        } catch (switchError: unknown) {
          if ((switchError as { code?: number }).code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [CELO_MAINNET_PARAMS]
            });
          }
        }
      }

      const addr = getAddress(accounts[0]);
      const client = createWalletClient({
        chain: celo,
        transport: custom(ethereum)
      });

      setAddress(addr);
      setIsConnected(true);
      setIsMiniPay(isMiniPayDetected);
      setWalletClient(client);

      try { localStorage.setItem('micromind_address', addr); } catch {}
      try { localStorage.setItem('micromind_connected', 'true'); } catch {}
      try { localStorage.removeItem('micromind_disconnected'); } catch {}

      await fetchBalances(addr);

      try {
        await ethereum.request({
          method: 'wallet_watchAsset',
          params: {
            type: 'ERC20',
            options: {
              address: cUSD_ADDRESS,
              symbol: 'USDm',
              decimals: 18,
            }
          }
        });
      } catch { /* non-critical */ }

    } catch (e: unknown) {
      const code = (e as { code?: number }).code;
      if (code !== 4001) {
        console.error('Connect failed:', e instanceof Error ? e.message : e);
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
