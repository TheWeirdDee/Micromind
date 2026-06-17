# MicroMind — AI-Powered Journal on Celo

MicroMind is a mobile-first journaling app with cross-device sync, powered by AI on Celo. Write freely for free. Pay only when you want AI insight — a few cents at a time in cUSD, every interaction verifiable onchain.

No subscriptions. Your journal syncs across all your devices and is only readable by you.

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
- Accounts created with **username + email + password** — access from any device
- Real-time username availability check during signup
- Journal entries synced to Supabase, cached locally in `localStorage` for offline use
- Mood tracking per entry (Happy, Excited, Neutral, Angry, Sad)
- Folder system — create and name folders to organize entries
- Edit entries inline, assign to folders, move between folders
- Reflect and Pattern tools can be scoped to a specific folder
- Daily streak tracker — writing an entry counts toward your streak

### Wallet Support
- **MiniPay**: auto-detected and auto-connected — zero friction
- **MetaMask**: manual connect, auto-switches to Celo Mainnet
- Wallet is only required for AI tool payments — journaling is always free
- Multi-provider conflict resolution — prefers MetaMask over other injected wallets

---

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Browser (Next.js)                       │
│                                                                │
│  Auth (username/email/password)                                │
│       ↓                                                        │
│  Journal entries (write locally → sync to Supabase)           │
│       ↓                                                        │
│  AI Tools: pay in cUSD → MicroMindPayment contract on Celo    │
└────────┬───────────────────────────┬──────────────────────────┘
         │                           │
         ▼                           ▼
┌─────────────────┐        ┌──────────────────────┐
│    Supabase      │        │  MicroMindPayment     │
│  - profiles      │        │  contract (Celo)      │
│  - journal_entries│       │  0xDdf2...D214c       │
│  - journal_folders│       └──────────┬────────────┘
└─────────────────┘                    │ PromptPaid event
                                       ▼
                              ┌──────────────────┐
                              │   AI Agent        │
                              │  (Express/Groq)   │
                              │  Llama-3.3-70b    │
                              └──────────────────┘
```

Only the prompt hash and payment touch the chain. The agent reads the on-chain event to know which prompt to run.

---

## Tech Stack

- **Frontend**: Next.js 15, Tailwind CSS, Framer Motion, Viem
- **Auth & Storage**: Supabase (PostgreSQL + Row Level Security)
- **Backend**: Node.js, Express, Groq SDK (Llama-3.3-70b), Upstash Redis
- **Email**: Resend
- **Smart Contracts**: Solidity, Hardhat, deployed on Celo Mainnet
- **Network**: Celo Mainnet (`chainId: 42220`)

---

## Smart Contracts

**MicroMindPayment (cUSD)** — `0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c`

**MicroMindPayment (CELO native)** — `0xeeEa78792266D3dE17Df648113c9eF6930AdbCE5`

Tool IDs
```
1 = Chat
2 = Tweet
3 = Reflect
4 = Pattern
5 = Letter
```

---

## Supabase Schema

Run this SQL in your Supabase project (**SQL Editor → New query**):

```sql
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

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

CREATE TABLE public.journal_folders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at_ts BIGINT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_folders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users manage own entries" ON public.journal_entries FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users manage own folders" ON public.journal_folders FOR ALL USING (auth.uid() = user_id);
```

---

## AI Agent

- **8004 Agent ID**: `9054`
- **Self Agent ID**: `0x0aa829dd2c57c7c94635951d3d3c85379a150dbdc05a59323b0a489179c89ca0`

---

## Run Locally

### Prerequisites
- Node.js 18+
- Supabase project (free tier works)

### Setup

```bash
# 1. Install dependencies
npm install
cd agent && npm install && cd ..
cd contracts && npm install && cd ..

# 2. Environment — copy .env.local and fill in:
#   NEXT_PUBLIC_SUPABASE_URL=...
#   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
#   NEXT_PUBLIC_CONTRACT_ADDRESS=...
#   NEXT_PUBLIC_AGENT_API_URL=http://localhost:8080
#   OPENAI_API_KEY=... (or GROQ_API_KEY)

# 3. Run everything
npm run dev:all
```

Frontend runs on `http://localhost:3000`, agent on `http://localhost:8080`.

---

Built for the **Celo Proof of Ship** competition.
