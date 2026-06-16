# MicroMind — Private Journal with AI on Celo

MicroMind is a mobile-first journaling app where your thoughts stay private on your device, and AI helps you understand them — for a few cents at a time, paid in cUSD on Celo.

No subscription. No cloud account required. Write freely for free. Pay only when you want AI insight. Every interaction is verifiable onchain.

**Built for MiniPay users** in Nigeria, Kenya, Ghana, and beyond.

---

## Features

| Feature | Price | Description |
|---------|-------|-------------|
| Journal | Free | Write entries, track mood, organize into folders |
| Reflect | 0.005 cUSD | AI reads your recent entries and writes a personal weekly reflection |
| Pattern | 0.005 cUSD | AI surfaces 3 emotional patterns across all your entries |
| Letter | Free / 0.01 cUSD | Write a letter and send it to any email — AI polish optional |
| Tweet | 0.005 cUSD | Turn a journal entry or thought into a tweet |
| Chat | 0.005 cUSD | General AI assistant |

### Journal Highlights
- Entries stored locally in `localStorage` — never sent to a server
- Mood tracking per entry (Happy, Excited, Neutral, Angry, Sad)
- Folder system — create and name folders to organize entries
- Edit entries inline, assign to folders, move between folders
- Reflect and Pattern tools can be scoped to a specific folder
- Daily streak tracker — writing an entry counts toward your streak

### Wallet Support
- **MiniPay**: auto-detected and auto-connected — zero friction
- **MetaMask**: manual connect, auto-switches to Celo Mainnet
- Multi-provider conflict resolution — prefers MetaMask over other injected wallets (e.g. Zerion)

---

## Architecture

```
┌─────────────┐      pay (cUSD)      ┌──────────────────┐
│   Browser   │ ───────────────────▶ │  MicroMindPayment │
│  (Next.js)  │                      │  contract (Celo)  │
└──────┬──────┘ ◀─────────────────── └────────┬──────────┘
       │           PromptPaid event           │
       │ submit prompt / poll                 │ listens for
       ▼                                       ▼
┌─────────────┐                       ┌──────────────────┐
│  AI Agent    │ ───── Groq API ────▶ │  Llama-3.3-70b    │
│ (Express)    │                      │  inference        │
└──────────────┘                      └──────────────────┘
```

Journal entries never leave the browser (`localStorage` only). Only the prompt hash and payment touch the chain; the agent reads the on-chain event to know which prompt to run.

---

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion, Viem
- **Backend**: Node.js, Express, Groq SDK (Llama-3.3-70b), Upstash Redis
- **Email**: Resend
- **Smart Contracts**: Solidity, Hardhat, deployed on Celo Mainnet
- **Network**: Celo Mainnet (`chainId: 42220`)

---

## Smart Contract

**MicroMindPayment (cUSD)** — `0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c`

Tool IDs  
```
1 = Chat      
2 = Tweet     
3 = Reflect   
4 = Pattern   
5 = Letter    
```

---

## AI Agent

- **8004 Agent ID**: `9054`
- **Self Agent ID**: `0x0aa829dd2c57c7c94635951d3d3c85379a150dbdc05a59323b0a489179c89ca0`

---

## Run Locally

### Prerequisites
- Node.js 18+

### Setup

```bash
# 1. Install dependencies
npm install
cd agent && npm install && cd ..
cd contracts && npm install && cd ..

# 2. Environment files
# Root: copy .env.example → .env.local, fill in values
# agent/: copy .env.example → .env, fill in GROQ_API_KEY, CONTRACT_ADDRESS, RESEND_API_KEY
# contracts/: copy .env.example → .env, fill in PRIVATE_KEY

# 3. Run everything
npm run dev:all
```

Frontend runs on `http://localhost:3000`, agent on `http://localhost:8080`.

---

Built for the **Celo Proof of Ship** competition.
