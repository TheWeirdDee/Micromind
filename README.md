# MicroMind — Privacy-First AI Journaling & Gamified Scribe on Celo

MicroMind is a mobile-first, privacy-first AI journaling app built on Celo and designed for MiniPay. Write freely with no cost. Pay only when you want an AI insight — a few cents at a time in USDm, every transaction verifiable onchain. Play our gamified Clarity Quest to sharpen your cognitive reframing, earn gameplay points, and cash them out directly to stablecoins.

**No subscriptions. No data harvesting. No vendor lock-in.**

Built for MiniPay users across Africa and beyond.

> Live Dapp: [micromindapp.xyz](https://micromindapp.xyz)  
> Live AI Relayer: [micromind-production.up.railway.app](https://micromind-production.up.railway.app)

---

## Feature Ecosystem

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
| **30-Day Staking Challenge** | 5.00 USDm Stake | Stake USDm, journal daily for 30 days, and withdraw your stake plus a reward if you complete it — principal is always returned even if you don't. |
| **Short Article Challenge** | Free | Write a short article on the monthly community prompt, then vote for your favorite among everyone's submissions. The most-voted story wins. |
| **Therapeutic Writing** | Free | Tell us what you want to explore and get 3 tailored journaling prompts — meant to help you find your own words, not replace them. |

---

## Clarity Quest (Gamified CBT Scribe)

The flagship mini-game in MicroMind is **Clarity Quest**. Instead of a mindless distraction, it is an active self-awareness tool:
* **The Concept:** You are presented with a cognitive distortion (e.g. catastrophizing) and a flat sentence. You must unscramble the scrambled letters to find the emotionally precise **target CBT word** (e.g. *APPRECIATIVE*, *COURAGEOUS*) that reframes the thought.
* **10 Locked Levels:** Level 1 features 3 simple stages. Higher levels feature more stages and longer words, and remain locked and invisible until preceding levels are fully completed.
* **Timed Challenge & Points Forfeit:** You have exactly **2 minutes (120 seconds)** to solve each stage. If the clock runs out, you can retry as many times as you like to unlock the next level, but you permanently forfeit the points for that stage.
* **Real-Money Redemptions:** 
  * Level 1 solves grant `+1 Point` per stage. Level 10 solves grant `+10 Points` per stage.
  * Accumulate points and cash out directly inside the app: **10 Points = 0.005 USDm**.
  * The backend relayer automatically transfers the cUSD/USDm token directly to your wallet address on Celo mainnet.

---

## Client-Side Escrow Letters (AES-GCM-256)

Write messages to your future self or loved ones and lock them in digital escrow:
1. **Client-Side Encryption, Server-Side Escrow:** Letters are encrypted directly on your device using the **Web Crypto API (AES-GCM-256)** before anything is uploaded — your plaintext never touches our servers. The decryption key is escrowed alongside the ciphertext (not zero-knowledge in the strict sense) so the release cron can decrypt and email it once the release date arrives; this is the same tradeoff journal entries use (see `docs/journal_encryption.sql`).
2. **Escrow Storage:** The encrypted payload is uploaded to Supabase. You can edit, cancel, or retry (if a send ever fails) a pending letter at any time prior to release.
3. **Autorelease Delivery Cron:** A backend server cron runs every 15 minutes (`.github/workflows/release-letters-cron.yml`), claims due letters one at a time (so overlapping runs can't double-send), decrypts them, and dispatches them via **Resend custom domain mailers** — retrying automatically up to 3 times before giving up.
4. **Auth-Gated:** Both the instant-send and scheduled-escrow paths require a signed-in MicroMind account — see `docs/letters_hardening.sql` and `src/app/api/letter/send/route.ts`.

---

## Therapeutic Writing

A free AI tool built around a simple idea: in a world where people write less and lean on AI to write *for* them, MicroMind wants AI to help people write *more*, in their own voice. Tell it what you want to explore — a feeling, an event, a relationship, a transition — and it generates 3 short, tailored journaling prompts (not a written entry) to help you find your own words. Requires a signed-in session (so it can't be used as an anonymous AI-quota drain) but is otherwise completely free.

---

## 30-Day Staking Challenge & Short Article Challenge

Two community-driven, Web3-native incentive loops layered on top of journaling:

* **30-Day Staking Challenge:** Stake USDm on-chain (`MicroMindStaking.sol`) and commit to a daily "morning pages" habit. Miss too many days and you still get your full stake back — the challenge is lossless. Hit the required check-in count and you also collect a USDm reward, guaranteed and reserved for you the moment you start, unaffected by how many other people finish before you. Fully gasless via an EIP-712-signed relayer flow.
* **Short Article Challenge:** Each month opens a themed writing prompt. Submit one short article while the window is open, then the community votes for its favorite during the voting window — one vote per person, no self-votes, no revote spam. The most-voted story wins the challenge. Pure reputation/leaderboard feature, no token stake required.

---

## Gasless Web3 Architecture

MicroMind is optimized to run smoothly on low-end smartphones in emerging markets:
* **Gasless Relayer (EIP-712):** Users sign an off-chain typed-data message authorizing a payment — no transaction, no gas. Our backend relayer submits the actual on-chain call and pays the CELO gas for it, but the USDm price itself is still pulled from the user's own wallet (via an allowance they approve once, paid for in USDm gas through CIP-64 `feeCurrency` rather than CELO) — the relayer only ever fronts gas, never the payment.
* **MiniPay Integration:** Auto-detects Opera's MiniPay wallet for instant sub-cent stablecoin payments. Falls back to MetaMask on desktop.
* **Offline-First Storage:** All diary entries and settings are cached locally in `localStorage` first, allowing zero-latency loading and offline writing. Background synchronization updates Supabase when internet connectivity is active.

---

## Tech Stack & Environment Setup

* **Frontend:** Next.js 16 (App Router), React 19, Framer Motion v12, Tailwind CSS v4.
* **Database & Auth:** Supabase Auth (Row Level Security enabled) + PostgreSQL.
* **Web3 SDK:** Viem, Wagmi, Celo Mainnet (`chainId: 42220`).
* **Agent Engine:** Express.js, Groq SDK (Llama-3.3-70b-versatile).
* **Mailing Service:** Resend API.

### Deployed Contracts (Celo Mainnet)

| Contract | Address | Explorer |
| :--- | :--- | :--- |
| `MicroMindPayment` (AI tool payments) | `0x3e449ebd5ee4278db9258350486137350a6B1556` | [Celoscan](https://celoscan.io/address/0x3e449ebd5ee4278db9258350486137350a6B1556) |
| `MicroMindStaking` (30-Day Challenge) | `0x04Eb288d2e2c6f506769a76532564818E22D18Ff` | [Celoscan](https://celoscan.io/address/0x04Eb288d2e2c6f506769a76532564818E22D18Ff#code) |
| `EncryptedOnchainJournal` (0.01 USDm permanent encrypted saves only) | `0xabB385E7e9e482f871fCEfb15aEFabc7B3AA63f7` | [Celoscan](https://celoscan.io/address/0xabB385E7e9e482f871fCEfb15aEFabc7B3AA63f7) |



MicroMindPayment handles AI-tool charges. EncryptedOnchainJournal is a separate contract used only for permanent encrypted journal saves; it atomically collects the 0.01 USDm save fee and stores ciphertext. It is not the address for other MicroMind payments.

### Environment Setup

Create a `/.env.local` file in the root directory:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_CONTRACT_ADDRESS=0x3e449ebd5ee4278db9258350486137350a6B1556
NEXT_PUBLIC_ONCHAIN_JOURNAL_ADDRESS=0xabB385E7e9e482f871fCEfb15aEFabc7B3AA63f7
NEXT_PUBLIC_STAKING_CONTRACT_ADDRESS=0x04Eb288d2e2c6f506769a76532564818E22D18Ff
NEXT_PUBLIC_AGENT_API_URL=https://your-hosted-agent.up.railway.app
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your-vapid-public-key
RESEND_API_KEY=re_your_resend_api_key
RESEND_FROM_EMAIL=MicroMind Letters <letters@micromindapp.xyz>
```

Create a `/agent/.env` file in the agent directory:
```env
PORT=3001
CONTRACT_ADDRESS=0x3e449ebd5ee4278db9258350486137350a6B1556
STAKING_CONTRACT_ADDRESS=0xe57C982D669869673750d46a935A97eC756A2281
PRIVATE_KEY=0x_your_developer_relayer_wallet_private_key
GROQ_API_KEY=gsk_your_groq_api_key
RESEND_API_KEY=re_your_resend_api_key
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
UPSTASH_REDIS_REST_URL=https://your-redis-url.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
CRON_SECRET=your-shared-secret-for-the-release-letters-cron
VAPID_PUBLIC_KEY=your-vapid-public-key
VAPID_PRIVATE_KEY=your-vapid-private-key
VAPID_SUBJECT=mailto:you@yourdomain.com
```

---

## Database Schema

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
-- NOTE: profiles' SELECT and quest_progress's write policy below are the
-- HARDENED versions. The originally-shipped versions ("Anyone can read
-- profiles" USING (true), and a FOR ALL policy on quest_progress) were both
-- critical bugs — the former let any unauthenticated client read every
-- user's email and journal encryption key; the latter let a client write
-- arbitrary clarity_points redeemable for real USDm. See
-- docs/profiles_security_hardening.sql and docs/quest_security_hardening.sql.
CREATE POLICY "Users can read own profile" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own folders" ON public.journal_folders FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own entries" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can read own quest progress" ON public.quest_progress FOR SELECT TO authenticated USING (auth.uid() = user_id);
-- quest_progress has no client INSERT/UPDATE policy — only the agent
-- backend (service role, bypasses RLS) writes it, via /api/quest/solve,
-- /api/quest/withdraw, /api/quest/reset, after independently verifying
-- every state change server-side.

-- Narrow view for cross-user username lookups (signup availability check,
-- story author attribution) — only id/username, never email or the journal
-- encryption key, regardless of what RLS allows on the base table.
CREATE OR REPLACE VIEW public.public_profiles WITH (security_invoker = false) AS
  SELECT id, username FROM public.profiles;
GRANT SELECT ON public.public_profiles TO anon, authenticated;
```

For the short article challenge and staking-relayer nonce tables, run
`docs/story_challenges.sql` and `docs/relay_nonces.sql` as well.
For an existing community-writing deployment, also run docs/short_articles_migration.sql to apply the short-article limits and create the article cover-image bucket/policies.

---

## Local Run & Build

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

## License
MIT — Crafted for Celo's Proof of Ship competition. Built for frictionless mobile web3 adoption.
