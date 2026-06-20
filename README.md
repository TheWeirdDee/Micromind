# MicroMind — Privacy-First AI Journaling on Celo

MicroMind is a mobile-first, privacy-first AI journaling app built on Celo and designed for MiniPay. Write freely with no cost. Pay only when you want an AI insight — a few cents at a time in cUSD, every transaction verifiable onchain.

**No subscriptions. No data harvesting. No vendor lock-in.**

Built for MiniPay users across Africa and beyond.

> Live: [micromind-three.vercel.app](https://micromind-three.vercel.app)

---

## Features

| Tool | Price | Description |
|------|-------|-------------|
| Journal | Free | Write entries, track mood, organize into folders, streak tracking |
| Reflect | 0.005 cUSD | AI synthesizes your recent entries into a compassionate weekly reflection |
| Pattern Analyst | 0.005 cUSD | AI surfaces 3 recurring emotional themes across your entire journal history |
| Heartfelt Letter | Free + 0.01 cUSD | Write and email a letter to anyone — optional AI polish for 0.01 cUSD |
| Tweet Gen | 0.005 cUSD | Turn a journal entry into a draft tweet |
| Mind Chat | 0.005 cUSD | General AI companion for private conversations |

### Journal
- Accounts via **email + password** — access from any device
- Real-time username availability check during signup
- Entries synced to Supabase, cached locally for offline use
- Mood tracking per entry (Happy, Excited, Neutral, Angry, Sad)
- Folder system — create named folders to organize entries
- Reflect and Pattern tools can be scoped to a specific folder
- Daily streak tracker
- **Send as Letter** — pre-fill the letter page from any journal entry

### Heartfelt Letters
- Send a letter draft for free to any email address
- Optional AI Polish (0.01 cUSD) rewrites your draft while preserving your voice
- **Starred contacts** — save recipients for one-tap filling
- All sends (free and paid) recorded in history
- Powered by Resend; letters are delivered directly to the recipient's inbox

### Wallet
- **MiniPay**: auto-detected and connected — zero friction
- **MetaMask**: manual connect, auto-switches to Celo Mainnet
- Wallet is only required for paid AI tools — journaling and basic letter sending are always free

---

## Architecture

```
Browser (Next.js 16 + React 19)
│
├── Auth: email + password via Supabase Auth
├── Journal: write locally → sync to Supabase (RLS-protected)
├── Letter send (free): Next.js API route → Resend (no agent needed)
│
└── AI Tools: user pays cUSD → MicroMindPayment contract on Celo
                                        │
                                        │ PromptPaid event
                                        ▼
                               AI Agent (Express + Groq)
                               listens for on-chain events
                               runs Llama-3.3-70b
                               returns result to client

Supabase
├── profiles       (id, username, email)
├── journal_entries
└── journal_folders

Smart Contracts (Celo Mainnet)
└── MicroMindPayment  0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c
```

Only the prompt hash and payment touch the chain. The agent reads the on-chain `PromptPaid` event to know which prompt to execute.

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16, React 19 |
| Styling | Tailwind CSS v4, Framer Motion v12 |
| Fonts | Playfair Display (serif), DM Mono (mono), Ultra (display) |
| Auth & DB | Supabase (PostgreSQL + Row Level Security) |
| Blockchain | Celo Mainnet (`chainId: 42220`), Viem, Wagmi |
| AI Agent | Express.js, Groq SDK (Llama-3.3-70b) |
| Email | Resend |
| Dedup cache | Upstash Redis (optional) |
| Deployment | Vercel (frontend), any Node host (agent) |

---

## Smart Contracts

**MicroMindPayment (cUSD)** — `0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c`  
[View on Celoscan](https://celoscan.io/address/0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c)

**MicroMindPayment (CELO native)** — `0xeeEa78792266D3dE17Df648113c9eF6930AdbCE5`

Tool IDs registered on-chain:
```
1 = Mind Chat
2 = Tweet Gen
3 = Weekly Reflect
4 = Pattern Analyst
5 = Heartfelt Letter (AI Polish)
```

---

## Environment Variables

### Frontend (`/.env.local`)

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_CONTRACT_ADDRESS=0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c
NEXT_PUBLIC_AGENT_API_URL=http://localhost:8080

# Required for letter sending via the Next.js API route
RESEND_API_KEY=re_your_key_here

# Optional: use a verified custom domain sender (recommended for production)
# Without this, only emails to your Resend account email will be delivered (sandbox mode)
RESEND_FROM_EMAIL=letters@yourdomain.com
```

### Agent (`/agent/.env`)

```env
CONTRACT_ADDRESS=0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c
GROQ_API_KEY=your_groq_key
RESEND_API_KEY=re_your_key_here
RESEND_FROM_EMAIL=letters@yourdomain.com  # optional, defaults to onboarding@resend.dev

# Optional — enables prompt deduplication to prevent double-execution
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...
```

---

## Supabase Setup

Run the following SQL in your Supabase project under **SQL Editor → New query**:

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

## Run Locally

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- A Resend API key (free at [resend.com](https://resend.com)) for letter sending

### Setup

```bash
# 1. Clone
git clone https://github.com/TheWeirdDee/Micromind.git
cd Micromind

# 2. Install dependencies
npm install
cd agent && npm install && cd ..

# 3. Create environment files
cp .env.local.example .env.local     # fill in your values
cp agent/.env.example agent/.env     # fill in your values

# 4. Run frontend + agent together
npm run dev:all
```

- Frontend: `http://localhost:3000`
- Agent: `http://localhost:8080`

To run them separately:
```bash
npm run dev          # Next.js frontend only
npm run agent        # AI agent only
```

---

## Email Delivery Note

Resend's free plan operates in **sandbox mode** — outbound emails only deliver to the email address registered on your Resend account. To send letters to any recipient, you need a custom domain:

1. Buy a domain (e.g. via Vercel Domains, Namecheap, etc.)
2. Add and verify the domain in your [Resend dashboard](https://resend.com/domains)
3. Set `RESEND_FROM_EMAIL=letters@yourdomain.com` in both `.env.local` and your Vercel environment variables

---

## Deployment

The frontend deploys to Vercel automatically on push to `main`.

Required Vercel environment variables (same as `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_CONTRACT_ADDRESS`
- `NEXT_PUBLIC_AGENT_API_URL` — your hosted agent URL
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL` (if using a custom domain)

The AI agent can be deployed to any Node.js host (Railway, Render, Fly.io, etc.) and must be publicly accessible for the on-chain event listener to work.

---

## Project Structure

```
micromind/
├── src/
│   ├── app/
│   │   ├── app/           # Authenticated app routes (journal, chat, reflect, letter, etc.)
│   │   ├── api/           # Next.js API routes (letter send, etc.)
│   │   └── page.tsx       # Landing page
│   ├── components/
│   │   ├── landing/       # Landing page sections
│   │   └── auth/          # Auth modal
│   ├── context/           # WalletContext, AuthContext
│   └── lib/               # journal.ts, supabase.ts, contract ABIs
├── agent/
│   └── src/index.ts       # Express AI agent (Groq + Resend + Viem)
├── contracts/             # Solidity + Hardhat
└── private/scripts/       # Wallet funding and validation scripts
```

---

## License

MIT — built for the Celo Proof of Ship competition.

[GitHub](https://github.com/TheWeirdDee/Micromind) · [Report an Issue](https://github.com/TheWeirdDee/Micromind/issues) · [Celo Network](https://celo.org)
