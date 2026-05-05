# MicroMind — Pay-per-thought AI

> **Pay in cUSD. Get AI. No subscriptions. Just MicroMind.**

MicroMind is a premium, MiniPay-native AI application built on the Celo blockchain. It solves the barrier of expensive AI subscriptions by offering a pure pay-per-use model, tailored for the 14M+ users in the MiniPay ecosystem.

![Aesthetic](https://img.shields.io/badge/Aesthetic-Dark%20Halftone%20Editorial-0A0A0A?style=for-the-badge)
![Network](https://img.shields.io/badge/Network-Celo%20Mainnet-35D07F?style=for-the-badge)
![Token](https://img.shields.io/badge/Token-cUSD-FBCC5C?style=for-the-badge)

---

## ⚡ Features

- **AI Chat**: General-purpose assistant for 0.01 cUSD.
- **Resume Generator**: Structured professional resumes for 0.05 cUSD.
- **Tweet Generator**: Viral-ready social content for 0.01 cUSD.
- **Bio Generator**: Personalized professional bios for 0.02 cUSD.
- **Zero Subscriptions**: No monthly fees. Connect your wallet and pay only for the prompts you send.
- **MiniPay Optimized**: Built mobile-first for the Celo MiniPay browser environment.
- **Fully Onchain**: Every prompt is backed by a verifiable transaction on the Celo Mainnet.

---

## 🎨 Design Philosophy: Dark Halftone Editorial

MicroMind features a high-fidelity "Dark Halftone Editorial" aesthetic inspired by premium tech journals and luxury minimal interfaces.

- **Background**: Near-black (`#0A0A0A`) with a CSS-driven halftone dot-grid pattern.
- **Texture**: Subtle noise/grain overlay for a print-media feel.
- **Typography**: 
  - `Playfair Display`: Elegant serif for headlines.
  - `DM Mono`: Technical monospace for UI and metadata.
- **Motion**: Staggered fade-up entry animations and smooth layout transitions via Framer Motion.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Web3**: Viem & Wagmi (Optimized for MiniPay compatibility)
- **Animation**: Framer Motion
- **Icons**: Lucide React
- **Blockchain**: Celo Mainnet (cUSD stablecoin)

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- A Celo wallet with a small amount of cUSD (MiniPay recommended)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TheWeirdDee/Micromind.git
   cd Micromind
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env.local` file in the root:
   ```env
   NEXT_PUBLIC_CONTRACT_ADDRESS=0xYourContractAddress
   NEXT_PUBLIC_CUSD_ADDRESS=0x765DE816845861e75A25fCA122bb6898B8B1282a
   NEXT_PUBLIC_CHAIN_ID=42220
   NEXT_PUBLIC_AGENT_API_URL=https://your-agent-endpoint.com
   ```

4. **Run development server:**
   ```bash
   npm run dev
   ```

---

## 🏗️ Architecture

MicroMind uses a dual-layer architecture:
1. **Onchain Layer**: A Solidity smart contract on Celo handles cUSD payments and emits `PromptPaid` events with a cryptographic `promptHash`.
2. **Offchain Layer**: An AI Agent backend listens for these events, validates the transaction, and processes the AI request via OpenAI or Gaia.

---

## 📜 Smart Contract

The contract supports:
- `payForPrompt(uint8 toolId, bytes32 promptHash)`: The core entry point for users.
- `getToolPrice(uint8 toolId)`: Transparent pricing retrieval.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.

---

Built with ❤️ for the **Proof of Ship** Hackathon 2025.
