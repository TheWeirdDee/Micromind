export const CONTRACT_ADDRESS =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS as `0x${string}`;

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
