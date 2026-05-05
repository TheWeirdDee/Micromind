# MicroMind — Engineering Specification
**Covers:** Smart Contract · Backend Agent Service · API · Deployment  
**Network:** Celo Mainnet (`chainId: 42220`)  
**Test Network:** Celo Alfajores (`chainId: 44787`)

---

## 1. Smart Contract

### 1.1 Contract: `MicroMindPayment.sol`

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MicroMindPayment is Ownable, ReentrancyGuard {
    IERC20 public immutable cUSD;
    
    // Tool IDs
    uint8 public constant TOOL_CHAT   = 0;
    uint8 public constant TOOL_RESUME = 1;
    uint8 public constant TOOL_TWEET  = 2;
    uint8 public constant TOOL_BIO    = 3;
    
    // Prices in cUSD (18 decimals)
    mapping(uint8 => uint256) public toolPrices;
    
    // Track payments
    mapping(address => uint256) public totalSpent;
    mapping(bytes32 => bool) public promptPaid;
    
    event PromptPaid(
        address indexed user,
        uint8 indexed toolId,
        bytes32 promptHash,
        uint256 amount,
        uint256 timestamp
    );
    
    event PriceUpdated(uint8 toolId, uint256 newPrice);
    
    constructor(address _cUSD) Ownable(msg.sender) {
        cUSD = IERC20(_cUSD);
        // Set initial prices (in wei, 18 decimals)
        toolPrices[TOOL_CHAT]   = 0.01 ether;  // 0.01 cUSD
        toolPrices[TOOL_RESUME] = 0.05 ether;  // 0.05 cUSD
        toolPrices[TOOL_TWEET]  = 0.01 ether;  // 0.01 cUSD
        toolPrices[TOOL_BIO]    = 0.02 ether;  // 0.02 cUSD
    }
    
    function payForPrompt(
        uint8 toolId,
        bytes32 promptHash
    ) external nonReentrant {
        require(toolId <= TOOL_BIO, "Invalid tool");
        require(!promptPaid[promptHash], "Prompt already paid");
        
        uint256 price = toolPrices[toolId];
        require(price > 0, "Tool not priced");
        
        promptPaid[promptHash] = true;
        totalSpent[msg.sender] += price;
        
        require(
            cUSD.transferFrom(msg.sender, address(this), price),
            "Payment failed"
        );
        
        emit PromptPaid(msg.sender, toolId, promptHash, price, block.timestamp);
    }
    
    function setToolPrice(uint8 toolId, uint256 price) external onlyOwner {
        require(toolId <= TOOL_BIO, "Invalid tool");
        toolPrices[toolId] = price;
        emit PriceUpdated(toolId, price);
    }
    
    function withdraw(uint256 amount) external onlyOwner {
        require(cUSD.transfer(owner(), amount), "Withdraw failed");
    }
    
    function getToolPrice(uint8 toolId) external view returns (uint256) {
        return toolPrices[toolId];
    }
    
    function getBalance() external view returns (uint256) {
        return cUSD.balanceOf(address(this));
    }
}
```

### 1.2 Contract Addresses

```
cUSD (Celo Mainnet):   0x765DE816845861e75A25fCA122bb6898B8B1282a
cUSD (Alfajores):      0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1
MicroMindPayment:      [DEPLOY AND FILL IN]
```

### 1.3 ABI (Frontend-relevant functions only)

```json
[
  {
    "name": "payForPrompt",
    "type": "function",
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
      { "name": "promptHash", "type": "bytes32" },
      { "name": "amount", "type": "uint256" },
      { "name": "timestamp", "type": "uint256" }
    ]
  }
]
```

---

## 2. Hardhat Configuration

### `hardhat.config.ts`
```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: { optimizer: { enabled: true, runs: 200 } }
  },
  networks: {
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      chainId: 44787,
      accounts: [process.env.PRIVATE_KEY!]
    },
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: [process.env.PRIVATE_KEY!]
    }
  },
  etherscan: {
    apiKey: {
      alfajores: process.env.CELOSCAN_API_KEY!,
      celo: process.env.CELOSCAN_API_KEY!
    },
    customChains: [
      {
        network: "alfajores",
        chainId: 44787,
        urls: {
          apiURL: "https://api-alfajores.celoscan.io/api",
          browserURL: "https://alfajores.celoscan.io"
        }
      },
      {
        network: "celo",
        chainId: 42220,
        urls: {
          apiURL: "https://api.celoscan.io/api",
          browserURL: "https://celoscan.io"
        }
      }
    ]
  }
};
export default config;
```

### Deploy Script: `scripts/deploy.ts`
```typescript
import { ethers } from "hardhat";

async function main() {
  const CUSD_MAINNET = "0x765DE816845861e75A25fCA122bb6898B8B1282a";
  const CUSD_ALFAJORES = "0x874069Fa1Eb16D44d622F2e0Ca25eeA172369bC1";
  
  const isMainnet = network.name === "celo";
  const cUSDAddress = isMainnet ? CUSD_MAINNET : CUSD_ALFAJORES;
  
  const MicroMindPayment = await ethers.getContractFactory("MicroMindPayment");
  const contract = await MicroMindPayment.deploy(cUSDAddress);
  await contract.waitForDeployment();
  
  console.log("MicroMindPayment deployed to:", await contract.getAddress());
}
main().catch(console.error);
```

### Verify Contract
```bash
npx hardhat verify --network celo <CONTRACT_ADDRESS> <CUSD_ADDRESS>
```

---

## 3. Backend Agent Service

### 3.1 Architecture

```
[Celo Mainnet]
      │
      │ PromptPaid event
      ↓
[Agent Listener (Node.js)]
      │
      │ verify txHash + extract prompt
      ↓
[OpenAI API call]
      │
      │ AI response
      ↓
[Store in DB / Return via API]
      │
      ↓
[Frontend polls /api/response/:txHash]
```

### 3.2 Agent Listener: `agent/listener.ts`
```typescript
import { createPublicClient, http, parseAbiItem } from 'viem';
import { celo } from 'viem/chains';
import OpenAI from 'openai';

const client = createPublicClient({ chain: celo, transport: http() });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const MICROMIND_ADDRESS = process.env.CONTRACT_ADDRESS as `0x${string}`;

// In-memory store (use Redis or DB in production)
const responseStore = new Map<string, string>();

async function startListener() {
  console.log('Agent listening for PromptPaid events...');
  
  client.watchContractEvent({
    address: MICROMIND_ADDRESS,
    abi: [{
      name: 'PromptPaid',
      type: 'event',
      inputs: [
        { name: 'user', type: 'address', indexed: true },
        { name: 'toolId', type: 'uint8', indexed: true },
        { name: 'promptHash', type: 'bytes32' },
        { name: 'amount', type: 'uint256' },
        { name: 'timestamp', type: 'uint256' }
      ]
    }],
    eventName: 'PromptPaid',
    onLogs: async (logs) => {
      for (const log of logs) {
        const { user, toolId, promptHash } = log.args;
        const txHash = log.transactionHash;
        console.log(`New prompt from ${user}, tool: ${toolId}, tx: ${txHash}`);
        
        // Look up the actual prompt from our off-chain store
        // (prompt is submitted to API and stored before payment)
        const prompt = await getPromptByHash(promptHash as string);
        if (!prompt) continue;
        
        const response = await callAI(Number(toolId), prompt);
        responseStore.set(txHash!, response);
      }
    }
  });
}

async function callAI(toolId: number, prompt: string): Promise<string> {
  const systemPrompts: Record<number, string> = {
    0: "You are a helpful AI assistant. Be concise and clear.",
    1: "You are a professional resume writer. Create structured, ATS-friendly content.",
    2: "You are a Twitter copywriter. Write punchy, engaging tweets under 280 characters.",
    3: "You are a branding expert. Write short, impactful professional bios."
  };
  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    max_tokens: 500,
    messages: [
      { role: "system", content: systemPrompts[toolId] || systemPrompts[0] },
      { role: "user", content: prompt }
    ]
  });
  
  return completion.choices[0].message.content || "No response generated.";
}

startListener();
```

### 3.3 API Endpoints

```
POST /api/prompt/submit
  Body: { prompt: string, toolId: number, userAddress: string }
  Returns: { promptHash: string }
  Note: Store prompt off-chain, return hash for on-chain payment

GET /api/response/:txHash
  Returns: { status: "pending" | "ready", response?: string }
  Note: Poll this after payment confirmed

GET /api/health
  Returns: { status: "ok", agentId: string }
```

### 3.4 API Server: `agent/server.ts`
```typescript
import express from 'express';
import { keccak256, toBytes } from 'viem';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const promptStore = new Map<string, { prompt: string, toolId: number, user: string }>();
const responseStore = new Map<string, string>();

app.post('/api/prompt/submit', (req, res) => {
  const { prompt, toolId, userAddress } = req.body;
  
  if (!prompt || toolId === undefined || !userAddress) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  // Generate deterministic hash of prompt + user + timestamp
  const promptHash = keccak256(
    toBytes(`${prompt}:${userAddress}:${Date.now()}`)
  );
  
  promptStore.set(promptHash, { prompt, toolId, user: userAddress });
  
  res.json({ promptHash });
});

app.get('/api/response/:txHash', (req, res) => {
  const { txHash } = req.params;
  const response = responseStore.get(txHash);
  
  if (!response) {
    return res.json({ status: 'pending' });
  }
  
  res.json({ status: 'ready', response });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    agentId: process.env.SELF_AGENT_ID || 'unregistered' 
  });
});

app.listen(3001, () => console.log('Agent API running on :3001'));
```

---

## 4. Environment Variables

### Frontend (`.env.local`)
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
NEXT_PUBLIC_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
NEXT_PUBLIC_CHAIN_ID=42220
NEXT_PUBLIC_AGENT_API_URL=https://your-agent.railway.app
```

### Backend (`.env`)
```env
OPENAI_API_KEY=sk-...
CONTRACT_ADDRESS=0xYOUR_CONTRACT_ADDRESS
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
CELOSCAN_API_KEY=YOUR_CELOSCAN_KEY
SELF_AGENT_ID=YOUR_SELF_AGENT_ID
AGENT_8004_ID=YOUR_8004_AGENT_ID
PORT=3001
```

---

## 5. Testing

### Unit Tests: `test/MicroMindPayment.ts`
```typescript
import { expect } from "chai";
import { ethers } from "hardhat";

describe("MicroMindPayment", () => {
  it("should accept cUSD payment for chat prompt", async () => {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy mock cUSD
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockCUSD = await MockERC20.deploy("cUSD", "cUSD", 18);
    
    // Mint cUSD to user
    await mockCUSD.mint(user.address, ethers.parseEther("1"));
    
    // Deploy contract
    const MMP = await ethers.getContractFactory("MicroMindPayment");
    const contract = await MMP.deploy(await mockCUSD.getAddress());
    
    // Approve and pay
    const price = ethers.parseEther("0.01");
    await mockCUSD.connect(user).approve(await contract.getAddress(), price);
    
    const promptHash = ethers.keccak256(ethers.toUtf8Bytes("test prompt"));
    await expect(contract.connect(user).payForPrompt(0, promptHash))
      .to.emit(contract, "PromptPaid")
      .withArgs(user.address, 0, promptHash, price, anyValue);
  });
  
  it("should reject duplicate promptHash", async () => {
    // ... test double-spend prevention
  });
  
  it("should allow owner to withdraw", async () => {
    // ... test withdrawal
  });
});
```

---

## 6. Deployment

### Alfajores (Testnet)
```bash
npx hardhat run scripts/deploy.ts --network alfajores
npx hardhat verify --network alfajores <ADDRESS> <CUSD_ALFAJORES>
```

### Celo Mainnet
```bash
npx hardhat run scripts/deploy.ts --network celo
npx hardhat verify --network celo <ADDRESS> <CUSD_MAINNET>
```

### Frontend (Vercel)
```bash
vercel --prod
# Set env vars in Vercel dashboard
```

### Agent Backend (Railway)
```bash
# Create railway.json or use CLI
railway up
# Set env vars in Railway dashboard
```

---

## 7. Security Checklist

- [ ] Smart contract audited with Slither: `slither contracts/`
- [ ] No private keys in frontend code
- [ ] Contract verified on Celoscan
- [ ] ReentrancyGuard on all payable functions
- [ ] Input validation on all API endpoints
- [ ] Rate limiting on `/api/prompt/submit` (max 10/min per IP)
- [ ] CORS restricted to your frontend domain in production
- [ ] Agent API key not exposed in frontend
- [ ] Prompt content not logged with PII
