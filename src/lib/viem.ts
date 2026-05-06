import { createPublicClient, createWalletClient, custom, http } from 'viem';
import { celo, celoSepolia } from 'viem/chains';

const IS_TESTNET = process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const publicClient = createPublicClient({
  chain: IS_TESTNET ? celoSepolia : celo,
  transport: http(),
});

export const getWalletClient = async () => {
  if (typeof window !== 'undefined' && window.ethereum) {
    return createWalletClient({
      chain: IS_TESTNET ? celoSepolia : celo,
      transport: custom(window.ethereum),
    });
  }
  return null;
};
