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
- **Celo Mainnet**: `0x2499F74A4ebADe7E61aac1B7E2760d55B598427F`

## 🤖 AI Agent Compliance
- **8004 Agent ID**: `9054`
- **Self Agent ID**: `0x0aa829dd2c57c7c94635951d3d3c85379a150dbdc05a59323b0a489179c89ca0`

---
Built for the **Celo Proof of Ship** competition.
Deadline: May 25, 2025.
