import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo, celoSepolia } from 'viem/chains';

/** True when running against Celo Sepolia testnet. Driven by NEXT_PUBLIC_IS_TESTNET env var. */
export const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

export interface EthereumProvider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, handler: (...args: unknown[]) => void): void;
  removeListener?(event: string, handler: (...args: unknown[]) => void): void;
  isMiniPay?: boolean;
  isMetaMask?: boolean;
  providers?: EthereumProvider[];
}

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

export const publicClient = createPublicClient({
  chain: IS_TESTNET ? celoSepolia : celo,
  transport: http(),
});

export const getWalletClient = async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    // Guard against non-object injections (e.g. malicious page scripts)
    if (typeof window.ethereum !== 'object') {
      throw new Error('window.ethereum is not a valid provider object');
    }
    return createWalletClient({
      chain: IS_TESTNET ? celoSepolia : celo,
      transport: custom(window.ethereum),
    });
  }
  return null;
};
