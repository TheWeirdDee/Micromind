export const IS_TESTNET = 
  process.env.NEXT_PUBLIC_IS_TESTNET === 'true';

export const CHAIN_CONFIG = IS_TESTNET ? {
  chainId: 11155420,
  chainIdHex: '0xAA37DC',
  name: 'Celo Sepolia Testnet',
  rpc: 'https://celo-sepolia.drpc.org',
  explorer: 'https://celo-sepolia.blockscout.com',
  networkLabel: 'TESTNET',
} : {
  chainId: 42220,
  chainIdHex: '0xA4EC',
  name: 'Celo Mainnet',
  rpc: 'https://forno.celo.org',
  explorer: 'https://celoscan.io',
  networkLabel: 'MAINNET',
};

// No ERC20 token — using native CELO
export const PAYMENT_TOKEN = 'CELO';
export const PAYMENT_DECIMALS = 18;
