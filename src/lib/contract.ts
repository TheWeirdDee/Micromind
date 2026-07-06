/** MicroMindPayment contract address on Celo Mainnet. */
export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

/** USDm token address on Celo Mainnet. */
export const USDm_ADDRESS =
  (process.env.NEXT_PUBLIC_USDm_ADDRESS ?? '0x765DE816845861e75A25fCA122bb6898B8B1282a') as `0x${string}`;

export const MICROMIND_ABI = [
  {
    name: 'payForPrompt',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'toolId', type: 'uint8' },
      { name: 'promptHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'getPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'toolId', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getAllPrices',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: 'prices', type: 'uint256[5]' }]
  },
  {
    name: 'contractBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'grandTotal',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'setToolPrice',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'toolId', type: 'uint8' },
      { name: 'newPrice', type: 'uint256' }
    ],
    outputs: []
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'PromptPaid',
    type: 'event',
    inputs: [
      { name: 'user',       type: 'address', indexed: true  },
      { name: 'toolId',     type: 'uint8',   indexed: true  },
      { name: 'amount',     type: 'uint256', indexed: false },
      { name: 'promptHash', type: 'bytes32', indexed: false },
      { name: 'timestamp',  type: 'uint256', indexed: false }
    ]
  },
  {
    name: 'PriceUpdated',
    type: 'event',
    inputs: [
      { name: 'toolId',   type: 'uint8',   indexed: true  },
      { name: 'newPrice', type: 'uint256', indexed: false }
    ]
  }
] as const;

// Prevent accidental runtime mutation of the ABI
Object.freeze(MICROMIND_ABI);

/** MicroMindStaking contract address on Celo Mainnet. */
export const STAKING_CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS as `0x${string}`;

export const MICROMIND_STAKING_ABI = [
  {
    name: 'startChallenge',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'checkIn',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'entryHash', type: 'bytes32' }],
    outputs: []
  },
  {
    name: 'withdraw',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: []
  },
  {
    name: 'challenges',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'address' }],
    outputs: [
      { name: 'startTime', type: 'uint256' },
      { name: 'checkInCount', type: 'uint16' },
      { name: 'active', type: 'bool' },
      { name: 'claimed', type: 'bool' }
    ]
  },
  {
    name: 'getCheckedInDays',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool[]' }]
  },
  {
    name: 'stakeAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'challengeDuration',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'requiredCheckins',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'rewardAmount',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'rewardPoolBalance',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  }
] as const;

Object.freeze(MICROMIND_STAKING_ABI);

