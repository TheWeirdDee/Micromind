import { celo } from 'viem/chains';

// MAINNET ONLY — no testnet
export const CHAIN = celo;
export const CHAIN_ID = 42220;
export const CHAIN_ID_HEX = '0xA4EC';
export const RPC_URL = 'https://forno.celo.org';
export const EXPLORER = 'https://celoscan.io';

// cUSD on Celo Mainnet
export const cUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

// Payment token info
export const PAYMENT_TOKEN_SYMBOL = 'cUSD';
export const PAYMENT_TOKEN_DECIMALS = 18; // cUSD uses 18 decimals

// MiniPay fee currency (pay gas in USDm)
export const USDm_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

export const CELO_MAINNET_PARAMS = {
  chainId: '0xA4EC',
  chainName: 'Celo Mainnet',
  nativeCurrency: { name: 'CELO', symbol: 'CELO', decimals: 18 },
  rpcUrls: ['https://forno.celo.org'],
  blockExplorerUrls: ['https://celoscan.io']
};
