import { celo } from 'viem/chains';

 
export const CHAIN = celo;
export const CHAIN_ID = 42220;
export const CHAIN_ID_HEX = '0xA4EC';
export const RPC_URL = 'https://forno.celo.org';
export const EXPLORER = 'https://celoscan.io';

// USDm on Celo Mainnet
export const USDm_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

// Payment token info
export const PAYMENT_TOKEN_SYMBOL = 'USDm';
export const PAYMENT_TOKEN_DECIMALS = 18; // USDm uses 18 decimals

export const CELO_MAINNET_PARAMS = {
  chainId: '0xA4EC',
  chainName: 'Celo Mainnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://celoscan.io']
};
