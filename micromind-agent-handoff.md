# MicroMind — Agent Handoff Document
**Covers:** AI Agent Architecture · 8004 Registration · Self Protocol Integration · Handoff Context for AI-assisted development

---

## 1. What "Agent" Means in This Context

MicroMind's AI functionality is delivered through an **on-chain registered agent** — a backend service that:

1. Holds its own wallet address on Celo Mainnet
2. Is registered in the **8004 agent registry**
3. Has a verified identity via **Self Protocol Agent ID**
4. Listens for on-chain payment events and processes AI prompts

This is required to qualify for the Proof of Ship **AI Agent Track** ($250 USDT).

---

## 2. Agent Identity Setup

### 2.1 Agent Wallet

The agent needs its own dedicated Celo wallet (separate from the deployer wallet).

```bash
# Generate a new wallet using cast (Foundry) or ethers.js
node -e "
const { ethers } = require('ethers');
const wallet = ethers.Wallet.createRandom();
console.log('Address:', wallet.address);
console.log('Private Key:', wallet.privateKey);
console.log('Mnemonic:', wallet.mnemonic.phrase);
"
```

**Save the private key securely.** Fund this wallet with:
- Small amount of CELO for gas (~0.5 CELO to start)
- Small amount of cUSD for any agent-side transactions

---

## 3. 8004 Agent Registration

### 3.1 What is 8004?
8004 is an agent registry on Celo. Registering your agent makes it discoverable and verifiable on-chain, which is a hard requirement for the AI Agent prize track.

### 3.2 Registration Steps

**Step 1:** Visit https://8004.xyz (or the official 8004 docs at https://docs.celo.org)

**Step 2:** Connect your **agent wallet** (not your personal wallet)

**Step 3:** Register the agent with the following metadata:
```json
{
  "name": "MicroMind Agent",
  "description": "Pay-per-use AI agent on Celo MiniPay",
  "version": "1.0.0",
  "capabilities": ["text-generation", "resume", "tweet", "bio"],
  "endpoint": "https://your-agent.railway.app/api",
  "owner": "YOUR_DEPLOYER_ADDRESS"
}
```

**Step 4:** Save your **8004 Agent ID** — you will need this in your `.env` and in your agent health endpoint.

**Step 5:** Record the registration transaction hash for your Proof of Ship submission.

---

## 4. Self Protocol Agent ID Registration

### 4.1 What is Self Protocol?
Self Protocol provides decentralized identity verification. Registering with Self gives your agent a verifiable on-chain identity, which is the second required component for the AI Agent track.

### 4.2 Resources
- Website: https://self.xyz
- Quickstart: https://docs.self.xyz/use-self/quickstart
- Telegram: https://t.me/selfprotocolbuilder

### 4.3 Registration Steps

**Step 1:** Go to https://self.xyz and connect your **agent wallet**

**Step 2:** Follow the quickstart guide to create an Agent ID

**Step 3:** The Self SDK integration in your agent looks like this:

```typescript
import { SelfSDK } from '@self-xyz/sdk'; // check actual package name at docs.self.xyz

const selfClient = new SelfSDK({
  agentId: process.env.SELF_AGENT_ID,
  privateKey: process.env.AGENT_PRIVATE_KEY,
  network: 'celo-mainnet'
});

// Verify agent identity on startup
async function initAgent() {
  const identity = await selfClient.verifyIdentity();
  console.log('Agent identity verified:', identity.agentId);
}
```

**Step 4:** Save your **Self Agent ID** to `.env` as `SELF_AGENT_ID`

**Step 5:** Expose the agent ID in your health endpoint:
```typescript
app.get('/api/health', async (req, res) => {
  res.json({
    status: 'ok',
    agentId: process.env.SELF_AGENT_ID,
    agent8004Id: process.env.AGENT_8004_ID,
    contractAddress: process.env.CONTRACT_ADDRESS,
    network: 'celo-mainnet'
  });
});
```

---

## 5. Agent Data Flow (Detailed)

```
User (MiniPay)
    │
    │ 1. POST /api/prompt/submit { prompt, toolId, address }
    ↓
Agent API Server
    │ Returns promptHash (keccak256 of prompt + address + nonce)
    ↓
User (MiniPay)
    │ 2. Calls cUSD.approve(contractAddress, price)
    │ 3. Calls contract.payForPrompt(toolId, promptHash)
    ↓
Celo Mainnet
    │ Emits PromptPaid(user, toolId, promptHash, amount, timestamp)
    ↓
Agent Listener (Viem watchContractEvent)
    │ 4. Detects event, extracts promptHash
    │ 5. Looks up prompt from promptStore by promptHash
    │ 6. Calls OpenAI API with system prompt for tool + user prompt
    ↓
OpenAI API
    │ Returns completion
    ↓
Agent Listener
    │ 7. Stores response: responseStore.set(txHash, response)
    ↓
User (polling /api/response/:txHash every 2s)
    │ 8. Gets { status: "ready", response: "..." }
    ↓
Frontend
    │ 9. Displays AI response + txHash badge
```

---

## 6. Prompt Hash Security

The `promptHash` links the off-chain prompt content to the on-chain payment. Here's the security model:

```typescript
// Hash generation (frontend, before payment)
import { keccak256, encodePacked } from 'viem';

function generatePromptHash(
  prompt: string,
  userAddress: string,
  nonce: number
): `0x${string}` {
  return keccak256(
    encodePacked(
      ['string', 'address', 'uint256'],
      [prompt, userAddress as `0x${string}`, BigInt(nonce)]
    )
  );
}
```

- The hash is **submitted to the API first** (stores prompt off-chain)
- Then the **same hash is sent on-chain** via `payForPrompt`
- The agent **matches them** to find the prompt for a given payment
- This prevents prompt injection — you can only get a response if you paid for the exact prompt hash

---

## 7. Agent Monitoring

### Health Check (call every 5 minutes via cron or uptime monitor)
```
GET https://your-agent.railway.app/api/health
Expected: { status: "ok" }
```

### Uptime Monitoring
Use UptimeRobot (free) or Better Uptime:
- Monitor: `GET https://your-agent.railway.app/api/health`
- Alert on: non-200 response

### Logging
```typescript
// Add to every agent action
console.log(JSON.stringify({
  timestamp: new Date().toISOString(),
  event: 'prompt_processed',
  txHash,
  toolId,
  user: user.slice(0, 10) + '...', // partial for privacy
  responseLength: response.length
}));
```

---

## 8. Handoff Context for Developers / AI Assistants

If you are an AI assistant (Claude, GPT, etc.) receiving this document to help with implementation, here is the critical context:

### What is built
- A Next.js Mini App for MiniPay (Celo's mobile wallet)
- Users pay cUSD per AI prompt via a Solidity smart contract
- An agent backend listens for on-chain events and calls OpenAI

### What still needs to be done (pick up from here)
1. Deploy smart contract to Alfajores, test, then Mainnet
2. Register agent with 8004 and Self Protocol
3. Build and deploy the agent listener + API server
4. Connect frontend to deployed contract
5. Test full end-to-end flow on Mainnet
6. Register on talent.app and enroll in Proof of Ship

### Key constraints
- **Do NOT use ethers.js** — MiniPay is incompatible. Use Viem/Wagmi only.
- **Network is Celo, not Ethereum** — different RPC, different gas token
- **cUSD is the payment token** — not ETH, not CELO
- **Mobile-first** — all UI must work on 390px width inside MiniPay browser
- **Submission deadline:** May 25, 2025 at 23:59 GMT

### Environment
```
Node.js: 18+
Package manager: npm or yarn
Framework: Next.js 14 (App Router)
Solidity: 0.8.20
Hardhat: latest
```

### Repositories to reference
- Celo Composer: https://github.com/celo-org/celo-composer
- MiniPay docs: https://docs.celo.org/developer/build-on-minipay/overview
- Viem docs: https://viem.sh
- OpenZeppelin: https://docs.openzeppelin.com/contracts/5.x/

---

## 9. AI Agent Track Checklist

Before submitting to Proof of Ship, verify all three requirements:

- [ ] **Registered with 8004** — transaction hash saved, Agent ID in env
- [ ] **Registered with Self Agent ID** — Self Protocol ID saved, integrated in agent
- [ ] **Agent wallet has onchain transactions on Celo Mainnet** — at least one real tx from agent address

Document all three in your project README and talent.app project page.
