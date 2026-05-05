# MicroMind — Pay-per-use AI on Celo

> AI Tools That Cost What You Actually Use.

MicroMind is a MiniPay-native Mini App that lets users access AI tools 
by paying small amounts of cUSD per prompt — no subscriptions, no accounts.

## Live App
[https://micromind.vercel.app](https://micromind.vercel.app)

## Smart Contract (Celo Mainnet)
[0xYOUR_CONTRACT_ADDRESS](https://celoscan.io/address/0xYOUR_CONTRACT)

## AI Agent
- 8004 Agent ID: [FILL IN]
- Self Agent ID: [FILL IN]
- Agent Wallet: [FILL IN]

## Tools
| Tool | Price |
|------|-------|
| AI Chat | 0.01 cUSD |
| Resume Generator | 0.05 cUSD |
| Tweet Generator | 0.01 cUSD |
| Bio Generator | 0.02 cUSD |

## Tech Stack
- Next.js 14 + Tailwind CSS
- Viem (no ethers.js)
- Solidity + Hardhat
- Groq API (Llama 3)
- Celo Mainnet

## Local Development
```bash
# Frontend
npm install
npm run dev

# Backend Agent
cd agent
npm install
npm run dev
```

## Deploy
```bash
# Deploy contract
cd contracts
npx hardhat run scripts/deploy.ts --network alfajores  # test first
npx hardhat run scripts/deploy.ts --network celo       # then mainnet
npx hardhat verify --network celo <ADDRESS> <CUSD_ADDRESS>

# Deploy frontend
vercel --prod

# Deploy agent
railway up
```

## Built for Proof of Ship — May 2026

---

### PROOF OF SHIP CHECKLIST:
- [ ] Smart contract deployed on Celo Mainnet
- [ ] Contract verified on Celoscan
- [ ] GitHub repo is public
- [ ] Project registered on talent.app
- [ ] Contract address added to talent.app project
- [ ] Agent registered with 8004 (https://8004.xyz)
- [ ] Agent registered with Self Protocol (https://self.xyz)
- [ ] Agent wallet has onchain transactions
- [ ] App deployed to Vercel (live URL)
- [ ] Agent deployed to Railway (live URL)
- [ ] Real end-to-end transaction tested on Mainnet
- [ ] Submitted before May 25, 2026 at 23:59 GMT
