# MicroMind — AI-Powered Builder Tools on Celo

MicroMind is a minimalist, mobile-first AI agent suite built for the Celo MiniPay ecosystem. It provides high-speed, on-chain tools for creators and developers, including AI Chat, Resume Generation, Tweet Crafting, and Bio Optimization.

## 🚀 Key Features
- **MiniPay Optimized**: Silent auto-detection and seamless payments.
- **On-Chain Payments**: Pay-per-prompt using cUSD on Celo Mainnet.
- **AI Agent Suite**: Powered by Llama-3.3-70b (via Groq) for high-fidelity responses.
- **Non-Custodial**: Full control of your assets via MetaMask or MiniPay.

## 🛠 Tech Stack
- **Frontend**: Next.js 15+, Tailwind CSS 4, Framer Motion.
- **Smart Contracts**: Solidity, Hardhat, Viem.
- **Backend**: Node.js, Express, Groq SDK, Upstash Redis.
- **Network**: Celo Mainnet / Alfajores Testnet.

## 📦 How to Run Locally

### 1. Prerequisites
- Node.js 18+
- [Foundry](https://getfoundry.sh) (for wallet generation)

### 2. Environment Setup
Create `.env.local` in root and `.env` in `agent/` and `contracts/` following the `.env.example` files provided in each directory.

### 3. Installation
```bash
npm install
cd agent && npm install
cd ../contracts && npm install
```

### 4. Run Everything
```bash
npm run dev:all
```

## 📜 Smart Contract
- **Celo Mainnet**: `[MAINNET_ADDRESS_HERE]`
- **Alfajores Testnet**: `[TESTNET_ADDRESS_HERE]`

## 🤖 AI Agent Compliance
- **8004 Agent ID**: `[AGENT_8004_ID_HERE]`
- **Self Agent ID**: `[SELF_AGENT_ID_HERE]`

---
Built for the **Celo Proof of Ship** competition.
Deadline: May 25, 2025.
