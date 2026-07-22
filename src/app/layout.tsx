import type { Metadata } from "next";
import { Playfair_Display, DM_Mono, Ultra } from "next/font/google";
import "./globals.css";
import { WalletProvider } from "@/context/WalletContext";
import { AuthProvider } from "@/context/AuthContext";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-serif",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

const ultra = Ultra({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL?.replace('/app', '') || 'https://micromindapp.xyz'),
  title: "MicroMind | Private Journaling on Celo",
  description: "A cozy, private journal on Celo. Write your thoughts, trace emotional patterns, take on gamified Clarity Quests, and schedule encrypted letters to your future self — with optional AI reflection tools priced per prompt in USDm.",
  keywords: ["Journaling", "Celo", "MiniPay", "Web3", "Privacy", "AI", "Mental Health", "Clarity Quest"],
  authors: [{ name: "MicroMind Team" }],
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "MicroMind | Private Journaling on Celo",
    description: "Embrace your inner clarity. A private, local-first journal with gamified Clarity Quests, encrypted future letters, and optional AI reflection tools — pay only for what you use, in USDm on Celo.",
    url: "https://micromindapp.xyz",
    siteName: "MicroMind",
    images: [
      {
        url: "/logo.svg",
        width: 1200,
        height: 630,
        alt: "MicroMind — AI journaling on Celo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "MicroMind | Private Journaling on Celo",
    description: "A private, local-first journal on Celo — Clarity Quests, encrypted future letters, and optional AI reflection tools priced per prompt in USDm.",
    images: ["/logo.svg"],
    creator: "@MicroMind_AI",
    site: "@MicroMind_AI",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "MicroMind",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "talentapp:project_verification": "334059f5ad573814e422e6282d39f1342429b9110189011a0885598328c8c1c39acde285687b932add1fe18f82782008e8f9c5652eb2e8f2cb4d1cc7d62f9b41",
    // MiniPay mini-app declaration — detected by Talent Protocol indexer
    "minipay": "true",
    "minipay:name": "MicroMind",
    "minipay:description": "A private, local-first journal on Celo with gamified Clarity Quests and optional AI reflection tools, priced per prompt in USDm.",
    "minipay:icon": "https://micromindapp.xyz/logo.svg",
    "minipay:url": "https://micromindapp.xyz/app",
    "minipay:fee_currency": "0x765DE816845861e75A25fCA122bb6898B8B1282a",
  },
};

export const viewport = {
  themeColor: "#0A0A0A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${playfair.variable} ${dmMono.variable} ${ultra.variable} antialiased selection:bg-accent selection:text-bg`}
      >
        <AuthProvider>
          <WalletProvider>
            <div className="grain-overlay" />
            <main className="min-h-screen">
              {children}
            </main>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
