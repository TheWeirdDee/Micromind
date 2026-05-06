# MicroMind — What To Do Right Now

## Step 1: Get Your Free API Keys (15 minutes)

### Groq API (AI — Free, No Card)
1. Go to https://console.groq.com
2. Sign up with Google or email
3. Click "API Keys" → "Create API Key"
4. Copy key → paste into agent/.env as GROQ_API_KEY=

### Celoscan API (Contract Verification — Free)
1. Go to https://celoscan.io
2. Sign up → go to API Keys → Add
3. Copy key → paste into contracts/.env as CELOSCAN_API_KEY=

## Step 2: Create Your Deployer Wallet (5 minutes)
Run in terminal:
npx cast wallet new
(Install foundry first if needed: https://getfoundry.sh)
OR generate in MetaMask → Accounts → Create Account → export private key

SAVE: Address + Private Key somewhere safe
Add private key to contracts/.env as PRIVATE_KEY=

## Step 3: Get Testnet Tokens (5 minutes)
1. Go to https://faucet.celo.org
2. Select **Celo Sepolia**
3. Paste your deployer wallet address
4. Request CELO (for gas)
5. Request cUSD (for testing payments)
Wait 30 seconds, tokens arrive.

## Step 4: Deploy Smart Contract to Sepolia (5 minutes)
cd contracts
npm install
npx hardhat compile
npx hardhat deploy-micromind --network sepolia

Copy the contract address from output.
Paste into: NEXT_PUBLIC_CONTRACT_ADDRESS= in .env.local
Also paste into: CONTRACT_ADDRESS= in agent/.env

## Step 5: Verify Contract (2 minutes)
npx hardhat verify --network sepolia CONTRACT_ADDRESS 0x765DE816845861e75A25fCA122bb6898B8B1282a
(Replace CONTRACT_ADDRESS with your actual address)

## Step 6: Start the App (1 minute)
In project root:
npm run dev:all

This starts:
- Frontend at http://localhost:3000
- Agent API at http://localhost:3001

## Step 7: Test with MetaMask (10 minutes)
1. Open MetaMask in Chrome
2. Go to http://localhost:3000/app
3. Click "Connect Wallet" — MetaMask will auto-add Celo Sepolia
4. Get cUSD from faucet if needed
5. Open /app/chat, type a prompt, click Pay & Generate
6. Approve cUSD in MetaMask, confirm payment
7. Wait for AI response (~10 seconds)
8. Check transaction on https://sepolia.celoscan.io

## Step 8: Deploy to Vercel (10 minutes)
npm install -g vercel
vercel --prod
Add all NEXT_PUBLIC_ env vars in Vercel dashboard.
Your app gets a live URL like https://micromind.vercel.app

## Step 9: Deploy Agent to Railway (15 minutes)
1. Go to https://railway.app
2. New project → Deploy from GitHub → select your repo
3. Set root directory: agent
4. Add all env vars from agent/.env
5. Deploy → copy your Railway URL
6. Update NEXT_PUBLIC_AGENT_API_URL in Vercel env vars

## Step 10: Deploy to Celo MAINNET (when ready)
1. Set IS_TESTNET=false in all env files
2. Buy ~$1 of CELO on any exchange, send to deployer wallet
3. npx hardhat run scripts/deploy.ts --network celo
4. Copy mainnet contract address → update all env vars
5. npx hardhat verify --network celo ADDRESS 0x765DE816845861e75A25fCA122bb6898B8B1282a
6. Redeploy Vercel + Railway with new env vars

## Step 11: Register for AI Agent Track (30 minutes, before May 25)
1. 8004 Registration: https://8004.xyz
   - Connect your agent wallet
   - Register "MicroMind Agent"
   - Save Agent ID → add to agent .env as AGENT_8004_ID=

2. Self Protocol: https://self.xyz
   - Follow quickstart: https://docs.self.xyz/use-self/quickstart
   - Register agent identity
   - Save Agent ID → add to agent .env as SELF_AGENT_ID=
   - Join Telegram for help: https://t.me/selfprotocolbuilder

## Step 12: Register on Talent App (required)
1. Go to https://talent.app
2. Create builder profile
3. Create project: MicroMind
4. Add GitHub repo (must be PUBLIC)
5. Add Celo Mainnet contract address
6. Go to Proof of Ship campaign → Enroll
7. Share in Telegram: https://t.me/proofofship
