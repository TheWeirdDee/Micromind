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
    name: 'PromptPaid',
    type: 'event',
    inputs: [
      { name: 'user',       type: 'address', indexed: true  },
      { name: 'toolId',     type: 'uint8',   indexed: true  },
      { name: 'amount',     type: 'uint256', indexed: false },
      { name: 'promptHash', type: 'bytes32', indexed: false },
      { name: 'timestamp',  type: 'uint256', indexed: false }
    ]
  }
] as const;
