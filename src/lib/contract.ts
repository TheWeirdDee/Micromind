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
    name: 'getToolPrice',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'toolId', type: 'uint8' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'getTotalSpent',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'PromptPaid',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'toolId', type: 'uint8', indexed: true },
      { name: 'promptHash', type: 'bytes32', indexed: false },
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false }
    ]
  }
] as const;
