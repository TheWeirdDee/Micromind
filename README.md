# 🧠 MicroMind — Privacy-First AI Journaling & Gamified Scribe on Celo

MicroMind is a mobile-first, privacy-first AI journaling app built on Celo and designed for MiniPay. Write freely with no cost. Pay only when you want an AI insight — a few cents at a time in USDm, every transaction verifiable onchain. Play our gamified Clarity Quest to sharpen your cognitive reframing, earn gameplay points, and cash them out directly to stablecoins.

**No subscriptions. No data harvesting. No vendor lock-in.**

Built for MiniPay users across Africa and beyond.

> Live Dapp: [micromindapp.xyz](https://micromindapp.xyz)  
> Live AI Relayer: [strong-possibility-production.up.railway.app](https://strong-possibility-production.up.railway.app)

---

## 🎨 Feature Ecosystem

| Feature / Tool | Price | Description |
| :--- | :--- | :--- |
| **Journal Companion** | Free | Rich markdown diary, mood tracking, folder organization, local-first syncing. |
| **Daily Streak Badges** | Free | Hybrid streak engine. Journaling OR playing Clarity Quest keeps it active (pulsing green). Doing BOTH unlocks the **Golden Streak** state with particle effects. |
| **Clarity Quest Game** | Free | Gamified vocabulary puzzles spanning 10 levels and 8 cognitive categories. |
| **AI Clue Hint** | 0.005 USDm | Get a contextual, psychological clue to help unscramble a target CBT word. |
| **AI Reframing Card** | 0.005 USDm | Generates a custom CBT cognitive reframe & personalized affirmation based on your solved word. |
| **Clarity Rewards Hub** | Free | Convert earned gameplay points directly into on-chain USDm stablecoins. |
| **Escrow Letters** | Free / 0.010 USDm | Web Crypto AES-GCM client-side encrypted letters scheduled for future cron delivery. |
| **Weekly Reflect** | 0.005 USDm | AI companion synthesizes recent entries into a weekly mindfulness reflection. |
| **Pattern Analyst** | 0.005 USDm | Identifies 3 recurring emotional themes and thinking traps in your writing. |
| **Tweet Generator** | 0.005 USDm | Turn any personal thought or entry into an engaging, voice-authentic draft tweet. |
| **Mind Chat** | 0.005 USDm | A secure, general-purpose AI chat companion for guidance. |

---

## 🎮 Clarity Quest (Gamified CBT Scribe)

The flagship mini-game in MicroMind is **Clarity Quest**. Instead of a mindless distraction, it is an active self-awareness tool:
* **The Concept:** You are presented with a cognitive distortion (e.g. catastrophizing) and a flat sentence. You must unscramble the scrambled letters to find the emotionally precise **target CBT word** (e.g. *APPRECIATIVE*, *COURAGEOUS*) that reframes the thought.
* **10 Locked Levels:** Level 1 features 3 simple stages. Higher levels feature more stages and longer words, and remain locked and invisible until preceding levels are fully completed.
* **Timed Challenge & Points Forfeit:** You have exactly **2 minutes (120 seconds)** to solve each stage. If the clock runs out, you can retry as many times as you like to unlock the next level, but you permanently forfeit the points for that stage.
* **Real-Money Redemptions:** 
  * Level 1 solves grant `+1 Point` per stage. Level 10 solves grant `+10 Points` per stage.
  * Accumulate points and cash out directly inside the app: **10 Points = 0.005 USDm**.
  * The backend relayer automatically transfers the cUSD/USDm token directly to your wallet address on Celo mainnet.

---

## 🔒 Client-Side Escrow Letters (AES-GCM-256)

Write messages to your future self or loved ones and lock them in digital escrow:
1. **Zero-Knowledge Encryption:** Letters are encrypted directly on your device using the **Web Crypto API (AES-GCM-256)**. The plaintext content never touches our servers.
2. **Escrow Storage:** The encrypted payload is uploaded to Supabase. You can cancel or delete a pending letter at any time prior to release.
3. **Autorelease Delivery Cron:** A backend server cron sweeps the database daily, identifies letters whose delivery time has passed, decrypts them securely using escrowed credentials, and dispatches them to recipients via **Resend custom domain mailers**.

---

## ⚡ Gasless Web3 Architecture

MicroMind is optimized to run smoothly on low-end smartphones in emerging markets:
* **Gasless Relayer (EIP-712):** Users sign their payment approvals off-chain (0 gas, 0 transaction complexity). Our backend Express relayer submits the transaction on-chain, paying gas in native CELO on Celo mainnet.
* **MiniPay Integration:** Auto-detects Opera's MiniPay wallet for instant sub-cent stablecoin payments. Falls back to MetaMask on desktop.
* **Offline-First Storage:** All diary entries and settings are cached locally in `localStorage` first, allowing zero-latency loading and offline writing. Background synchronization updates Supabase when internet connectivity is active.

---

## 🛠️ Tech Stack & Environment Setup

* **Frontend:** Next.js 16 (App Router), React 19, Framer Motion v12, Tailwind CSS v4.
* **Database & Auth:** Supabase Auth (Row Level Security enabled) + PostgreSQL.
* **Web3 SDK:** Viem, Wagmi, Celo Mainnet (`chainId: 42220`).
* **Agent Engine:** Express.js, Groq SDK (Llama-3.3-70b-versatile).
* **Mailing Service:** Resend API.

### Environment Setup

Create a `/.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CONTRACT_ADDRESS=0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c
NEXT_PUBLIC_AGENT_API_URL=https://your-hosted-agent.up.railway.app
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=letters@yourdomain.com
```

Create a `/agent/.env` file in the agent directory:
```env
PORT=3001
CONTRACT_ADDRESS=0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c
PRIVATE_KEY=0x_your_developer_relayer_wallet_private_key
GROQ_API_KEY=gsk_your_groq_api_key
RESEND_API_KEY=re_your_resend_api_key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

---

## 💾 Database Schema

Execute the following script in the Supabase SQL editor:
```sql
-- 1. Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Journal Folders
CREATE TABLE public.journal_folders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at_ts BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Journal Entries
CREATE TABLE public.journal_entries (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  mood TEXT DEFAULT 'neutral',
  timestamp BIGINT,
  folder_id TEXT,
  tags TEXT[] DEFAULT '{}',
  date TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Clarity Quest Progress
CREATE TABLE public.quest_progress (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_level INTEGER NOT NULL DEFAULT 1,
  current_stage INTEGER NOT NULL DEFAULT 1,
  completed_levels INTEGER[] NOT NULL DEFAULT '{}',
  clarity_points INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- RLS Enablement
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quest_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own folders" ON public.journal_folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own entries" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own quest progress" ON public.quest_progress FOR ALL USING (auth.uid() = user_id);
```

---

## 🏃 Local Run & Build

1. **Install Dependencies:**
   ```bash
   npm install
   cd agent && npm install && cd ..
   ```
2. **Launch Dev Servers:**
   ```bash
   npm run dev:all
   ```
   * Next.js Frontend runs at `http://localhost:3000`
   * Express AI Agent runs at `http://localhost:3001` (configured dynamically as `NEXT_PUBLIC_AGENT_API_URL`)

---

## 📄 License
MIT — Crafted for Celo's Proof of Ship competition. Built for frictionless mobile web3 adoption.
