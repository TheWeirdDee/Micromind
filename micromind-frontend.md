# MicroMind — Frontend Specification
**Stack:** Next.js 14 · Tailwind CSS · Viem · Wagmi  
**Target:** MiniPay Mini App (mobile-first, 390px viewport)

---

## 1. Design Principles

- **Mobile-first** — MiniPay runs inside Opera Mini on Android. Design for 390×844px minimum.
- **Minimal friction** — Every screen should have one primary action. No modals on top of modals.
- **Transparent pricing** — Price is shown before every payment. No surprises.
- **Optimistic UI** — Show loading states immediately. Users on mobile expect fast feedback.
- **Dark-friendly** — MiniPay UI is dark. Use neutral dark backgrounds (`#0f0f0f`, `#1a1a1a`).

---

## 2. Color Palette

```css
/* Primary Brand */
--color-primary: #6C5CE7;       /* Purple — AI / magic feel */
--color-primary-light: #A29BFE;
--color-primary-dark: #4834B8;

/* Backgrounds */
--color-bg: #0F0F0F;
--color-surface: #1A1A1A;
--color-surface-raised: #242424;

/* Text */
--color-text-primary: #FFFFFF;
--color-text-secondary: #A0A0A0;
--color-text-muted: #606060;

/* Semantic */
--color-success: #00B894;
--color-error: #D63031;
--color-warning: #FDCB6E;
--color-cUSD: #35D07F;          /* Celo green for cUSD amounts */
```

---

## 3. Typography

```css
/* Font: Inter (Google Fonts) */
--font-family: 'Inter', sans-serif;

/* Scale */
--text-xs:   12px;
--text-sm:   14px;
--text-base: 16px;
--text-lg:   18px;
--text-xl:   20px;
--text-2xl:  24px;
--text-3xl:  30px;
```

---

## 4. Page Structure & Routes

```
/                   → Home / Tool Selector
/chat               → AI Chat Tool
/resume             → Resume Generator (extended)
/tweet              → Tweet Generator (extended)
/bio                → Bio Generator (extended)
/history            → Prompt History
```

---

## 5. Screen Designs

### 5.1 Home Screen (`/`)

**Purpose:** Show wallet status + tool selection  
**Components:**
- `<WalletBadge />` — top-right, shows address (0x...xxxx) + cUSD balance
- `<HeroSection />` — tagline + brief explainer
- `<ToolGrid />` — 2×2 grid of tool cards
- `<RecentPrompts />` — last 3 prompts (local state or localStorage)

**Layout:**
```
┌─────────────────────────────┐
│  MicroMind     [0x...] 2.4 cUSD │  ← WalletBadge
├─────────────────────────────┤
│                             │
│   🤖 Pay per prompt.        │  ← Hero
│   No subscription needed.   │
│                             │
├─────────────────────────────┤
│  ┌─────────┐  ┌─────────┐  │
│  │  Chat   │  │ Resume  │  │  ← ToolGrid
│  │ 0.01 c$ │  │ 0.05 c$ │  │
│  └─────────┘  └─────────┘  │
│  ┌─────────┐  ┌─────────┐  │
│  │  Tweet  │  │  Bio    │  │
│  │ 0.01 c$ │  │ 0.02 c$ │  │
│  └─────────┘  └─────────┘  │
└─────────────────────────────┘
```

**Wallet not connected state:**
- Replace WalletBadge with `<ConnectButton />` (calls `connectMiniPay()`)
- Disable all tool cards with tooltip "Connect wallet to continue"

---

### 5.2 Chat Screen (`/chat`)

**Purpose:** Core AI Chat tool  
**Components:**
- `<BackButton />` — returns to home
- `<PromptInput />` — multiline textarea, max 500 chars, char counter
- `<PriceTag />` — "This prompt costs 0.01 cUSD"
- `<GenerateButton />` — "Pay & Generate" — primary CTA
- `<LoadingState />` — spinner with "Processing on Celo..."
- `<ResponseCard />` — displays AI output with copy button
- `<TxBadge />` — small badge linking to celoscan for the tx

**States:**
```
IDLE → (user types) → READY_TO_PAY → (pay clicked) → 
WAITING_WALLET → WAITING_CHAIN → WAITING_AI → COMPLETE
                                              ↓
                                           ERROR (retry)
```

**Layout:**
```
┌─────────────────────────────┐
│ ← Chat                      │  ← Back + title
├─────────────────────────────┤
│  ┌───────────────────────┐  │
│  │ What can I help you   │  │  ← PromptInput
│  │ think through today?  │  │
│  │                       │  │
│  │                  0/500│  │
│  └───────────────────────┘  │
│                             │
│  💵 This costs 0.01 cUSD    │  ← PriceTag
│                             │
│  ┌───────────────────────┐  │
│  │    Pay & Generate     │  │  ← GenerateButton
│  └───────────────────────┘  │
├─────────────────────────────┤
│  Response:                  │  ← ResponseCard (shown after)
│  ┌───────────────────────┐  │
│  │                       │  │
│  │  AI output here...    │  │
│  │                       │  │
│  │  [Copy] [Tx: 0x...↗]  │  │
│  └───────────────────────┘  │
└─────────────────────────────┘
```

---

### 5.3 Loading / Transaction State

Show a full-screen overlay or inline state transition:

```
Step 1: ⏳ Confirm in MiniPay...
Step 2: ⛓️  Broadcasting to Celo...
Step 3: 🤖 AI is thinking...
Step 4: ✅ Done!
```

Each step auto-advances as the async process completes. Use animated dots for active step.

---

### 5.4 History Screen (`/history`)

**Purpose:** Show previous prompts and spending  
**Components:**
- `<SpendingSummary />` — total cUSD spent
- `<PromptList />` — list of past prompts, tool used, cost, tx link
- `<EmptyState />` — "No prompts yet. Start your first one!"

---

## 6. Component Specifications

### `<WalletBadge />`
```tsx
// Props: { address: string, balance: string }
// Shows: truncated address + cUSD balance in Celo green
// Click: copies full address to clipboard
// Location: top-right of header
```

### `<ToolCard />`
```tsx
// Props: { name, description, price, icon, href, disabled }
// Active: full color, navigates to tool route
// Disabled: grayed out, shows "Connect wallet" tooltip
// Price: shown in cUSD with Celo green color
```

### `<PriceTag />`
```tsx
// Shows price preview before payment
// Must be visible without scrolling
// Animate in when prompt is valid (length > 10 chars)
```

### `<GenerateButton />`
```tsx
// States: default | loading | disabled
// Default: "Pay & Generate — 0.01 cUSD"
// Loading: spinner + "Processing..."
// Disabled: grayed, shown when no prompt entered
// Full width, 52px height, rounded-xl, primary purple
```

### `<ResponseCard />`
```tsx
// Displays AI markdown output (use react-markdown)
// Copy button top-right
// TxBadge bottom-right linking to celoscan.io
// Subtle border, surface-raised background
// Fade-in animation on mount
```

---

## 7. MiniPay Integration

### Detecting MiniPay
```typescript
// Check if running inside MiniPay browser
const isMiniPay = typeof window !== 'undefined' && 
  window.ethereum?.isMiniPay === true;
```

### Connecting Wallet
```typescript
import { createWalletClient, custom } from 'viem';
import { celo } from 'viem/chains';

async function connectMiniPay() {
  if (!window.ethereum) throw new Error('No wallet found');
  
  const [address] = await window.ethereum.request({
    method: 'eth_requestAccounts'
  });
  
  const walletClient = createWalletClient({
    account: address,
    chain: celo,
    transport: custom(window.ethereum)
  });
  
  return { address, walletClient };
}
```

### Reading cUSD Balance
```typescript
import { createPublicClient, http, erc20Abi } from 'viem';
import { celo } from 'viem/chains';

const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

const publicClient = createPublicClient({
  chain: celo,
  transport: http()
});

async function getCUSDBalance(address: `0x${string}`) {
  const balance = await publicClient.readContract({
    address: CUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: [address]
  });
  return balance; // BigInt in wei
}
```

### Paying for a Prompt
```typescript
import { parseUnits } from 'viem';

const MICROMIND_CONTRACT = '0xYOUR_CONTRACT_ADDRESS';
const CUSD_ADDRESS = '0x765DE816845861e75A25fCA122bb6898B8B1282a';

async function payForPrompt(walletClient, promptHash: `0x${string}`, toolId: number) {
  // Step 1: Approve cUSD spend
  const approveTx = await walletClient.writeContract({
    address: CUSD_ADDRESS,
    abi: erc20Abi,
    functionName: 'approve',
    args: [MICROMIND_CONTRACT, parseUnits('0.01', 18)]
  });
  
  await publicClient.waitForTransactionReceipt({ hash: approveTx });
  
  // Step 2: Call payForPrompt
  const payTx = await walletClient.writeContract({
    address: MICROMIND_CONTRACT,
    abi: MICROMIND_ABI,
    functionName: 'payForPrompt',
    args: [toolId, promptHash]
  });
  
  return payTx;
}
```

---

## 8. State Management

Use React Context + useReducer (no Redux needed for MVP):

```typescript
// AppContext holds:
{
  wallet: {
    address: string | null,
    balance: bigint | null,
    isConnected: boolean,
    walletClient: WalletClient | null
  },
  session: {
    prompts: PromptEntry[],
    totalSpent: number
  },
  ui: {
    isLoading: boolean,
    currentStep: PaymentStep | null,
    error: string | null
  }
}
```

---

## 9. Error Handling (UI)

| Error | User-facing message |
|---|---|
| Wallet not found | "Open this in MiniPay to continue" |
| Insufficient cUSD | "Not enough cUSD. Top up in MiniPay." |
| Transaction rejected | "Transaction cancelled. Try again." |
| TX timeout | "Transaction took too long. Check Celoscan." |
| AI error | "AI failed to respond. You were not charged." |
| Network error | "Network issue. Check your connection." |

All errors shown in a dismissible toast or inline below the button.

---

## 10. Performance Requirements

- First Contentful Paint: < 2s on 3G
- No heavy animations — MiniPay device CPUs are mid-range
- Lazy load history page
- Debounce prompt input changes (300ms)
- Cache cUSD balance for 30s before refetching

---

## 11. File Structure

```
/src
  /app
    /page.tsx                 ← Home
    /chat/page.tsx            ← Chat tool
    /resume/page.tsx          ← Resume tool
    /tweet/page.tsx           ← Tweet tool
    /bio/page.tsx             ← Bio tool
    /history/page.tsx         ← History
    /layout.tsx               ← Root layout + WalletProvider
  /components
    /wallet
      WalletBadge.tsx
      ConnectButton.tsx
    /tools
      ToolCard.tsx
      ToolGrid.tsx
    /chat
      PromptInput.tsx
      PriceTag.tsx
      GenerateButton.tsx
      ResponseCard.tsx
      TxBadge.tsx
      PaymentSteps.tsx
    /common
      LoadingSpinner.tsx
      ErrorToast.tsx
      EmptyState.tsx
  /context
    AppContext.tsx
    WalletContext.tsx
  /hooks
    useMiniPay.ts
    useCUSDBalance.ts
    usePayForPrompt.ts
    useAIGenerate.ts
  /lib
    viem.ts                   ← Public + wallet clients
    contract.ts               ← ABI + contract address
    openai.ts                 ← AI call helper
    utils.ts                  ← formatAddress, formatCUSD, etc.
  /constants
    tools.ts                  ← Tool definitions + prices
    chains.ts                 ← Celo chain config
```
