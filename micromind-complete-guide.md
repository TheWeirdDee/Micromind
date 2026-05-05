# MicroMind — Complete Step-by-Step Build Guide
**From zero to submitted on Proof of Ship by May 25, 2025**  
This document covers every step: accounts, installs, APIs, coding, deployment, and registration.

---

## PHASE 0 — Accounts & API Keys (Do This First)

Before writing a single line of code, get all your accounts and keys. Some of these have waiting periods.

### 0.1 Create a GitHub Account (if you don't have one)
1. Go to https://github.com
2. Sign up with your email
3. Create a new public repository called `micromind`
4. Initialize with a README

### 0.2 Create an OpenAI Account
1. Go to https://platform.openai.com
2. Sign up and verify your email
3. Go to **API Keys** → **Create new secret key**
4. Copy and save it: `sk-proj-...`
5. Add a payment method and set a **usage limit** ($5–10 to start)
   - Settings → Billing → Usage limits

> **Note:** You will use `gpt-4o-mini` — it costs roughly $0.00015 per prompt, very cheap.

### 0.3 Create a Celoscan Account (for contract verification)
1. Go to https://celoscan.io
2. Sign up for a free account
3. Go to API Keys → Add
4. Copy your API key

### 0.4 Create a Vercel Account (for frontend hosting)
1. Go to https://vercel.com
2. Sign up with your GitHub account
3. No configuration needed yet — you'll deploy later

### 0.5 Create a Railway Account (for agent backend hosting)
1. Go to https://railway.app
2. Sign up with your GitHub account
3. Start a new empty project — you'll deploy the agent here

### 0.6 Create a Talent App Profile (REQUIRED for Proof of Ship)
1. Go to https://talent.app
2. Create your builder profile
3. Click **Earn** → **Celo Proof of Ship**
4. Create a new project:
   - Name: MicroMind
   - Description: Pay-per-use AI Mini App on MiniPay
   - Add your GitHub repo
5. Enroll in the Proof of Ship campaign
6. You will add your smart contract address later

### 0.7 Register with Self Protocol (for AI Agent Track)
1. Go to https://self.xyz
2. Follow the quickstart: https://docs.self.xyz/use-self/quickstart
3. Connect your **agent wallet** (create a new wallet — see Phase 1)
4. Complete the Agent ID registration
5. Save your **Self Agent ID**
6. Join the Self Builder Telegram for help: https://t.me/selfprotocolbuilder

### 0.8 Register with 8004 (for AI Agent Track)
1. Go to https://8004.xyz
2. Connect your **agent wallet**
3. Register your agent with name "MicroMind Agent"
4. Save your **8004 Agent ID** and the registration transaction hash

---

## PHASE 1 — Local Environment Setup

### 1.1 Install Node.js
```bash
# Install NVM (Node Version Manager) first
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash

# Restart terminal, then:
nvm install 18
nvm use 18
node --version  # Should say v18.x.x
```

### 1.2 Install Required Global Tools
```bash
npm install -g pnpm         # Faster package manager
npm install -g hardhat      # For smart contracts
```

### 1.3 Install Foundry (for wallet generation and contract tools)
```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
cast --version  # Verify install
```

### 1.4 Create Project Wallets

You need **two wallets**:
- **Deployer wallet** — deploys the contract, owns it
- **Agent wallet** — the AI agent's on-chain identity

```bash
# Generate Deployer Wallet
cast wallet new

# OUTPUT EXAMPLE:
# Address:     0xAbC...
# Private key: 0x123...
# SAVE BOTH — you won't see them again

# Generate Agent Wallet
cast wallet new
# Save this address and private key separately
```

> ⚠️ **NEVER share private keys. NEVER commit them to GitHub.**

### 1.5 Get Testnet Tokens (Alfajores)
1. Go to https://faucet.celo.org/alfajores
2. Paste your **deployer wallet address**
3. Request CELO + cUSD
4. Repeat for your **agent wallet address**

### 1.6 Get Mainnet Tokens (for live deployment)
- Buy CELO on any exchange (Binance, Coinbase, etc.) or use MiniPay
- Transfer a small amount (0.5 CELO) to your deployer wallet
- Transfer a small amount (0.5 CELO) to your agent wallet

---

## PHASE 2 — Project Scaffold

### 2.1 Clone Celo Composer (Recommended Starter)
```bash
npx @celo/celo-composer create

# Select:
# ✔ Project name: micromind
# ✔ Template: Next.js + Hardhat
# ✔ Package manager: npm

cd micromind
```

### 2.2 Install Dependencies
```bash
# Frontend
npm install viem wagmi @tanstack/react-query

# Smart contract tooling
cd packages/hardhat
npm install @openzeppelin/contracts dotenv
cd ../..

# Backend agent
mkdir packages/agent
cd packages/agent
npm init -y
npm install express viem openai cors dotenv
npm install --save-dev typescript @types/node @types/express ts-node
cd ../..
```

### 2.3 Set Up Environment Files

**packages/hardhat/.env**
```env
PRIVATE_KEY=0xYOUR_DEPLOYER_PRIVATE_KEY
CELOSCAN_API_KEY=YOUR_CELOSCAN_API_KEY
```

**packages/react-app/.env.local**
```env
NEXT_PUBLIC_CONTRACT_ADDRESS=                        # Fill after deploy
NEXT_PUBLIC_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
NEXT_PUBLIC_CHAIN_ID=42220
NEXT_PUBLIC_AGENT_API_URL=https://your-agent.railway.app
```

**packages/agent/.env**
```env
OPENAI_API_KEY=sk-...
CONTRACT_ADDRESS=                                    # Fill after deploy
AGENT_PRIVATE_KEY=0xYOUR_AGENT_PRIVATE_KEY
CELOSCAN_API_KEY=YOUR_CELOSCAN_API_KEY
SELF_AGENT_ID=                                       # Fill after Self registration
AGENT_8004_ID=                                       # Fill after 8004 registration
PORT=3001
```

> ⚠️ Add `.env` and `.env.local` to `.gitignore` immediately:
> ```bash
> echo ".env" >> .gitignore
> echo ".env.local" >> .gitignore
> ```

---

## PHASE 3 — Smart Contract

### 3.1 Write the Contract

Create file: `packages/hardhat/contracts/MicroMindPayment.sol`

Copy the full contract from the Engineering Specification document (`micromind-engineering.md`, Section 1.1).

### 3.2 Write Deploy Script

Create file: `packages/hardhat/scripts/deploy.ts`

Copy from Engineering Specification, Section 1 (Deploy Script).

### 3.3 Configure Hardhat

Replace `packages/hardhat/hardhat.config.ts` with the configuration from Engineering Specification, Section 2.

### 3.4 Compile the Contract
```bash
cd packages/hardhat
npx hardhat compile

# Expected output:
# Compiled 3 Solidity files successfully
```

### 3.5 Run Tests
```bash
npx hardhat test
# All tests should pass
```

### 3.6 Deploy to Alfajores (Testnet First!)
```bash
npx hardhat run scripts/deploy.ts --network alfajores

# Output:
# MicroMindPayment deployed to: 0xABC...
```

Save this address. Test the full flow on Alfajores before going to Mainnet.

### 3.7 Deploy to Celo Mainnet
```bash
npx hardhat run scripts/deploy.ts --network celo

# Output:
# MicroMindPayment deployed to: 0xDEF...
```

Save this as your **NEXT_PUBLIC_CONTRACT_ADDRESS**.

### 3.8 Verify Contract on Celoscan
```bash
npx hardhat verify --network celo <CONTRACT_ADDRESS> 0x765DE816845861e75A25fCA122bb6898B8B1282a

# Go to https://celoscan.io/address/<CONTRACT_ADDRESS>
# You should see the contract source code verified
```

### 3.9 Add Contract to Talent App
1. Go to your project on talent.app
2. Add the verified contract address
3. The leaderboard will now track your contract's transactions

---

## PHASE 4 — Backend Agent

### 4.1 Set Up TypeScript
```bash
cd packages/agent
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
EOF

mkdir src
```

### 4.2 Write the Agent

Create `packages/agent/src/index.ts` — combine the listener and server from Engineering Specification (Sections 3.2 and 3.3).

### 4.3 Add Start Script to `package.json`
```json
{
  "scripts": {
    "dev": "ts-node src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }
}
```

### 4.4 Test Agent Locally
```bash
cd packages/agent
npm run dev

# Should print:
# Agent API running on :3001
# Agent listening for PromptPaid events...
```

Test the health endpoint:
```bash
curl http://localhost:3001/api/health
# {"status":"ok","agentId":"..."}
```

Test prompt submission:
```bash
curl -X POST http://localhost:3001/api/prompt/submit \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Write a haiku about blockchain","toolId":0,"userAddress":"0x000"}'
# {"promptHash":"0x..."}
```

### 4.5 Deploy Agent to Railway
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize in the agent directory
cd packages/agent
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard:
# OPENAI_API_KEY, CONTRACT_ADDRESS, AGENT_PRIVATE_KEY, etc.
```

Note the Railway URL (e.g., `https://micromind-agent.railway.app`). Update `NEXT_PUBLIC_AGENT_API_URL` in frontend `.env.local`.

---

## PHASE 5 — Frontend

### 5.1 Build the Wallet Context

Create `packages/react-app/src/context/WalletContext.tsx`:

```typescript
'use client';
import { createContext, useContext, useState, useCallback } from 'react';
import { createWalletClient, createPublicClient, custom, http, erc20Abi } from 'viem';
import { celo } from 'viem/chains';

const CUSD = process.env.NEXT_PUBLIC_CUSD_ADDRESS as `0x${string}`;

const WalletContext = createContext<any>(null);

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [walletClient, setWalletClient] = useState<any>(null);

  const publicClient = createPublicClient({ chain: celo, transport: http() });

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      alert('Please open in MiniPay');
      return;
    }
    const [addr] = await window.ethereum.request({ method: 'eth_requestAccounts' });
    const client = createWalletClient({
      account: addr,
      chain: celo,
      transport: custom(window.ethereum)
    });
    setAddress(addr);
    setWalletClient(client);

    // Fetch cUSD balance
    const raw = await publicClient.readContract({
      address: CUSD, abi: erc20Abi, functionName: 'balanceOf', args: [addr]
    });
    setBalance((Number(raw) / 1e18).toFixed(4));
  }, []);

  return (
    <WalletContext.Provider value={{ address, balance, walletClient, connect, publicClient }}>
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => useContext(WalletContext);
```

### 5.2 Build the Home Page

Create `packages/react-app/src/app/page.tsx` following the layouts in the Frontend Specification document (Section 5.1).

### 5.3 Build the Chat Page

Create `packages/react-app/src/app/chat/page.tsx` with the payment flow:

```typescript
async function handlePayAndGenerate() {
  setStep('WAITING_WALLET');
  
  // 1. Submit prompt to get hash
  const { promptHash } = await fetch(`${AGENT_API}/api/prompt/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, toolId: 0, userAddress: address })
  }).then(r => r.json());

  // 2. Approve cUSD
  setStep('WAITING_CHAIN');
  const approveTx = await walletClient.writeContract({
    address: CUSD_ADDRESS, abi: erc20Abi,
    functionName: 'approve',
    args: [CONTRACT_ADDRESS, parseUnits('0.01', 18)]
  });
  await publicClient.waitForTransactionReceipt({ hash: approveTx });

  // 3. Pay for prompt
  const payTx = await walletClient.writeContract({
    address: CONTRACT_ADDRESS, abi: MICROMIND_ABI,
    functionName: 'payForPrompt',
    args: [0, promptHash]
  });
  await publicClient.waitForTransactionReceipt({ hash: payTx });

  // 4. Poll for AI response
  setStep('WAITING_AI');
  setTxHash(payTx);
  
  let result = null;
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 2000));
    const data = await fetch(`${AGENT_API}/api/response/${payTx}`).then(r => r.json());
    if (data.status === 'ready') { result = data.response; break; }
  }
  
  setResponse(result || 'No response received.');
  setStep('COMPLETE');
}
```

### 5.4 Test Frontend Locally
```bash
cd packages/react-app
npm run dev
# Visit http://localhost:3000
```

### 5.5 Deploy Frontend to Vercel
```bash
# From root
vercel --prod

# Set environment variables in Vercel dashboard
# (all NEXT_PUBLIC_ vars from .env.local)
```

Note the Vercel URL (e.g., `https://micromind.vercel.app`).

---

## PHASE 6 — End-to-End Testing

### 6.1 Test on Alfajores First

1. Switch frontend to use Alfajores contract address temporarily
2. Get testnet cUSD from https://faucet.celo.org/alfajores
3. Open the app in MiniPay (Settings → Developer Mode → Enter URL)
4. Connect wallet
5. Enter a prompt in Chat
6. Confirm payment in MiniPay
7. Verify:
   - Transaction appears on https://alfajores.celoscan.io
   - Agent receives the event (check Railway logs)
   - AI response appears in the frontend

### 6.2 Common Issues and Fixes

| Issue | Fix |
|---|---|
| "No wallet found" | Must open in MiniPay browser, not Chrome |
| "Insufficient cUSD" | Fund your wallet from faucet or MiniPay |
| Transaction stuck | Check Celo network status, try again |
| Agent not responding | Check Railway logs, verify CONTRACT_ADDRESS env var |
| CORS error | Add `CORS_ORIGIN=https://your-frontend.vercel.app` to agent env |

### 6.3 Mainnet Test

1. Switch back to Mainnet contract address
2. Use real cUSD (even 0.05 cUSD is enough for 5 test prompts)
3. Repeat the full flow
4. Verify transaction on https://celoscan.io

---

## PHASE 7 — Proof of Ship Submission

### 7.1 GitHub Repository Setup
```bash
# Make sure your repo is public
git add .
git commit -m "MicroMind: Pay-per-use AI Mini App on Celo"
git push origin main
```

Your README.md should include:
- Project description
- Demo URL
- Contract address (verified on Celoscan)
- How to run locally
- Tech stack

### 7.2 Update Talent App Project

1. Go to https://talent.app → Your project
2. Add:
   - Live URL (Vercel deployment)
   - GitHub repository
   - Smart contract address (Celo Mainnet)
   - Description mentioning AI Agent Track compliance
3. Verify the project website

### 7.3 AI Agent Track — Submit Evidence

In your talent.app project description, include:

```
AI Agent Track Compliance:
- 8004 Agent ID: [YOUR ID]
- 8004 Registration TX: [TX HASH on Celoscan]
- Self Agent ID: [YOUR ID]  
- Agent Wallet: [AGENT ADDRESS]
- Agent Wallet TX: [ANY TX HASH from agent address]
```

### 7.4 Final Checklist Before May 25

**Required (General Pool)**
- [ ] Project on Celo Mainnet with verified smart contract
- [ ] Open source GitHub repository (public)
- [ ] Project enrolled in Proof of Ship on talent.app
- [ ] Real onchain transactions (prompt payments)
- [ ] App accessible via URL

**Required (AI Agent Track)**
- [ ] Agent registered with 8004
- [ ] Agent registered with Self Protocol Agent ID
- [ ] Agent wallet has onchain transactions on Celo Mainnet

**Boosters (Extra Points)**
- [ ] MiniPay hook implemented (window.ethereum.isMiniPay detection)
- [ ] NPM packages published (if any utilities extracted)

**Nice to Have**
- [ ] Demo video (4 minutes: 1 min intro, 2 min walkthrough, 1 min challenges)
- [ ] Share project in Proof of Ship Telegram: https://t.me/proofofship

---

## PHASE 8 — Post-Submission

### 8.1 Drive Onchain Activity

The leaderboard scores on:
- Number of transactions
- Unique active users
- Fees generated

Share your app:
- Post in the Proof of Ship Telegram group
- Share on Twitter/X tagging @CeloDevs
- Post in relevant Web3 and Africa tech communities
- Ask friends to try it (even 10 prompts helps)

### 8.2 Monitor Your Position
- Leaderboard updates weekly: https://talent.app/~/earn/celo-proof-of-ship
- Track transactions: https://celoscan.io/address/<YOUR_CONTRACT>

### 8.3 Claim Rewards (if Top 50)
- Rewards are claimable through MiniPay after May 29
- Only the project owner (talent.app profile creator) can claim
- Deadline: before the next month's rewards distribution

---

## Quick Reference Links

| Resource | URL |
|---|---|
| Proof of Ship | https://talent.app/~/earn/celo-proof-of-ship |
| Celo Docs | https://docs.celo.org |
| MiniPay Build Guide | https://docs.celo.org/developer/build-on-minipay/overview |
| Celo Composer | https://github.com/celo-org/celo-composer |
| Alfajores Faucet | https://faucet.celo.org/alfajores |
| Celoscan (Mainnet) | https://celoscan.io |
| Celoscan (Testnet) | https://alfajores.celoscan.io |
| Self Protocol | https://self.xyz / https://docs.self.xyz |
| Self Builder TG | https://t.me/selfprotocolbuilder |
| 8004 Registry | https://8004.xyz |
| Proof of Ship TG | https://t.me/proofofship |
| OpenAI Platform | https://platform.openai.com |
| Viem Docs | https://viem.sh |
| Railway | https://railway.app |
| Vercel | https://vercel.com |
| Celopedia | https://celopedia.celo.org |
