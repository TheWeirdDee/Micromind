export const MICROMIND_ABI = [
  {
    "name": "payForPrompt",
    "type": "function",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "toolId", "type": "uint8" },
      { "name": "promptHash", "type": "bytes32" }
    ],
    "outputs": []
  },
  {
    "name": "getToolPrice",
    "type": "function",
    "stateMutability": "view",
    "inputs": [{ "name": "toolId", "type": "uint8" }],
    "outputs": [{ "type": "uint256" }]
  },
  {
    "name": "PromptPaid",
    "type": "event",
    "inputs": [
      { "name": "user", "type": "address", "indexed": true },
      { "name": "toolId", "type": "uint8", "indexed": true },
      { "name": "promptHash", "type": "bytes32", "indexed": false },
      { "name": "amount", "type": "uint256", "indexed": false },
      { "name": "timestamp", "type": "uint256", "indexed": false }
    ]
  }
] as const;

export const ERC20_ABI = [
  {
    "constant": false,
    "inputs": [
      { "name": "_spender", "type": "address" },
      { "name": "_value", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "payable": false,
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "constant": true,
    "inputs": [{ "name": "_owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "balance", "type": "uint256" }],
    "payable": false,
    "stateMutability": "view",
    "type": "function"
  }
] as const;
