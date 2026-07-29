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
    name: 'payForPromptFor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
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

export const MICROMIND_STAKING_ABI = [
  {
    name: 'startChallengeFor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: []
  },
  {
    name: 'checkInFor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'entryHash', type: 'bytes32' }
    ],
    outputs: []
  },
  {
    name: 'withdrawFor',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: []
  },
  {
    name: 'relayerPaused',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'bool' }]
  },
  {
    name: 'setRelayerPaused',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: '_paused', type: 'bool' }],
    outputs: []
  },
  {
    name: 'fundRewardPool',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'withdrawExcess',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'amount', type: 'uint256' }],
    outputs: []
  },
  {
    name: 'setParams',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: '_stakeAmount', type: 'uint256' },
      { name: '_challengeDuration', type: 'uint256' },
      { name: '_requiredCheckins', type: 'uint256' },
      { name: '_rewardAmount', type: 'uint256' }
    ],
    outputs: []
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
    name: 'totalStaked',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'reservedRewards',
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
  },
  {
    name: 'freeRewardPool',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }]
  },
  {
    name: 'owner',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'address' }]
  }
] as const;

