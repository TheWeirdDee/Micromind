import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo } from 'viem/chains';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const publicClient = createPublicClient({
  chain: celo,
  transport: http(),
});

export const getWalletClient = async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: celo,
      transport: custom(window.ethereum),
    });
  }
  return null;
};
