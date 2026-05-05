# MicroMind — Product Requirements Document (PRD)
**Version:** 2.0 — Proof of Ship May 2025 Edition  
**Deadline:** May 25, 2025 at 23:59 GMT  
**Prize Targets:** General Pool (Top 50, $5,000 USDT) + AI Agent Track (4 winners × $250 USDT)

---

## 1. Product Overview

### Tagline
> Pay per thought. No subscriptions. Just AI.

### Problem
AI tools are locked behind expensive monthly subscriptions that most users in emerging markets — especially MiniPay's 14M+ user base across Africa and beyond — cannot justify or afford. There is no accessible, micro-payment-native AI tool built for Web3 mobile wallets.

### Solution
MicroMind is a MiniPay-native Mini App that lets users pay small amounts of cUSD per AI action using their existing wallet — no account, no subscription, no friction. Each AI call is powered by a registered on-chain agent, making it eligible for the Proof of Ship AI Agent Track.

### Target Users
- MiniPay wallet holders in Africa and emerging markets
- Users who want occasional AI access without committing to a subscription
- Developers and creators who want affordable AI tooling

---

## 2. Goals and Success Metrics

### Primary Goals
- Ship a functional Mini App on Celo Mainnet by May 25, 2025
- Qualify for the General Pool leaderboard (Top 50)
- Qualify for the AI Agent Track (agent registered with 8004 + Self Agent ID + onchain wallet)

### Success Metrics (MVP)
| Metric | Target |
|---|---|
| Prompts processed | 50+ during contest period |
| Unique wallets | 10+ |
| Onchain transactions | 50+ |
| Agent registered | Yes (8004 + Self) |
| MiniPay hook implemented | Yes (booster points) |

---

## 3. Core Features

### 3.1 Wallet Connection (MiniPay)
- Detect MiniPay browser environment
- Connect using injected provider (window.ethereum via MiniPay)
- Display connected wallet address and cUSD balance
- No external wallet modal needed — MiniPay handles authentication

### 3.2 AI Tools (MVP: Chat Only; Extended: 4 Tools)

#### MVP Tool — AI Chat
- User enters a prompt (text input)
- App displays cost (e.g., 0.01 cUSD)
- User confirms and pays
- Transaction is confirmed on Celo Mainnet
- AI response is unlocked and displayed

#### Extended Tools (Nice to Have)
- **Resume Generator** — structured CV creation from bullet inputs
- **Tweet Generator** — punchy 280-character posts from a topic
- **Bio Generator** — short professional bio from name + role + keywords

### 3.3 Pricing System
- Fixed price per action, defined in smart contract or frontend config
- Display cost prominently before execution ("This will cost 0.01 cUSD")
- Price tiers:
  - Chat: 0.01 cUSD per prompt
  - Resume: 0.05 cUSD
  - Tweet: 0.01 cUSD
  - Bio: 0.02 cUSD

### 3.4 Payment Flow
1. User enters prompt
2. App shows price + estimated output
3. User presses "Pay & Generate"
4. App calls smart contract `payForPrompt()` function
5. Transaction confirmed on Celo Mainnet
6. Backend verifies txHash
7. AI agent processes prompt via registered agent
8. Response displayed to user

### 3.5 AI Agent (On-Chain Registered)
- Agent registered with **8004 registry** (required for AI Track)
- Agent registered with **Self Agent ID** via Self Protocol (required for AI Track)
- Agent wallet holds small cUSD balance for gas
- Agent processes prompts via OpenAI API (or Gaia as fallback)
- All agent activity traceable on-chain

### 3.6 Usage Tracking
- Per-session history (prompts + responses)
- Total cUSD spent
- Transaction hashes linking each prompt to the chain

---

## 4. User Flow

```
[Open MiniPay] → [Launch MicroMind Mini App]
      ↓
[Wallet auto-connects via MiniPay injected provider]
      ↓
[Home Screen: Select AI Tool]
      ↓
[Enter Prompt]
      ↓
[See Price Preview: "This costs 0.01 cUSD"]
      ↓
[Tap "Pay & Generate"]
      ↓
[MiniPay confirms transaction on Celo Mainnet]
      ↓
[Backend verifies tx → Agent processes prompt]
      ↓
[AI Response displayed]
      ↓
[Option: Copy / Share / Run another prompt]
```

---

## 5. Smart Contract Requirements

### Contract: `MicroMindPayment.sol`
- **Network:** Celo Mainnet (`chainId: 42220`)
- **Token:** cUSD (`0x765DE816845861e75A25fCA122bb6898B8B1282a`)
- **Functions:**
  - `payForPrompt(toolId, promptHash)` — transfers cUSD from user to contract
  - `withdraw(amount)` — owner withdraws collected fees
  - `setToolPrice(toolId, price)` — owner updates pricing
  - `getToolPrice(toolId)` — read price for a tool
- **Events:**
  - `PromptPaid(address user, uint8 toolId, bytes32 promptHash, uint256 amount, uint256 timestamp)`
- **Security:**
  - OpenZeppelin `Ownable` and `ReentrancyGuard`
  - Input validation on all parameters
  - No funds held longer than needed (owner sweeps regularly)

---

## 6. Agent Architecture

### Agent Registration Requirements (AI Track)
1. Register with **8004** — agent identity registry on Celo
2. Register with **Self Agent ID** — Self Protocol agent verification
3. Agent wallet must have **onchain transactions** on Celo Mainnet

### Agent Behavior
- Listens for `PromptPaid` events from the smart contract
- Verifies transaction validity
- Calls OpenAI API with the prompt
- Returns response to frontend via API endpoint
- Logs each interaction with txHash

### Agent Stack
- Node.js or Python microservice
- Ethers.js or Viem for event listening
- OpenAI SDK for AI calls
- Self Protocol SDK for agent ID verification

---

## 7. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 + Tailwind CSS |
| Wallet | Viem + Wagmi (MiniPay compatible) |
| Blockchain | Celo Mainnet |
| Smart Contract | Solidity + Hardhat |
| AI | OpenAI API (gpt-4o-mini) |
| Agent Registry | 8004 + Self Protocol |
| Deployment | Vercel (frontend) + Railway/Render (agent backend) |
| Token | cUSD (Celo stablecoin) |

---

## 8. MVP Scope (Ship by May 25)

### Must Have
- [ ] MiniPay wallet connection
- [ ] AI Chat tool with payment gate
- [ ] Smart contract on Celo Mainnet (verified)
- [ ] Agent registered with 8004
- [ ] Agent registered with Self Agent ID
- [ ] Agent wallet with onchain transactions
- [ ] Open source GitHub repository
- [ ] Project registered on talent.app
- [ ] Enrolled in Proof of Ship campaign

### Nice to Have
- [ ] Resume / Tweet / Bio generators
- [ ] Prompt history UI
- [ ] Usage analytics dashboard
- [ ] Referral/share mechanic

---

## 9. Monetization

- Charge users in cUSD per prompt
- Keep margin between user price and OpenAI API cost
  - OpenAI gpt-4o-mini: ~$0.0001–0.0003 per prompt
  - User pays: 0.01 cUSD (~$0.01)
  - Margin: ~97–99%
- Scale: at 1,000 prompts/month = ~$10 revenue with near-zero cost

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| OpenAI API costs spike | Cap max tokens per prompt; use gpt-4o-mini |
| MiniPay not available in tester's region | Test via MiniPay testnet or Alfajores faucet wallet |
| Agent registration complexity | Follow 8004 docs exactly; reach out in Telegram group |
| Smart contract bug | Use OpenZeppelin; test on Alfajores first |
| Low onchain activity for leaderboard | Share in Proof of Ship Telegram for early testers |

---

## 11. Timeline

| Date | Milestone |
|---|---|
| May 5–6 | Setup: repo, talent.app profile, Celo composer scaffold |
| May 7–8 | Smart contract written, tested on Alfajores |
| May 9–10 | Frontend: wallet connect + chat UI |
| May 11–12 | Backend agent: OpenAI integration + event listener |
| May 13–14 | Agent registration: 8004 + Self Protocol |
| May 15–16 | Deploy to Celo Mainnet, verify contract |
| May 17–19 | End-to-end testing, bug fixes |
| May 20–22 | Add extended tools (tweet, bio) if time allows |
| May 23–24 | Final polish, README, demo video |
| May 25 | Submit before 23:59 GMT |
