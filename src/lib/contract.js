"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ERC20_ABI = exports.MICROMIND_ABI = void 0;
exports.MICROMIND_ABI = [
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
    }
];
exports.ERC20_ABI = [
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
];
