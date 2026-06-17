import type { Metadata } from "next";
import { Playfair_Display, DM_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL?.replace('/app', '') || 'https://micromind-three.vercel.app'),
  title: "MicroMind | Pay-per-thought AI Agent",
  description: "Stop paying for AI subscriptions. MicroMind offers premium AI tools with a simple pay-per-thought model using native CELO on Celo.",
  keywords: ["AI", "Celo", "MiniPay", "Web3", "Pay-per-prompt", "Llama 3", "Crypto AI"],
  authors: [{ name: "MicroMind Team" }],
  icons: {
    icon: "/logo.svg",
    shortcut: "/logo.svg",
    apple: "/logo.svg",
  },
  openGraph: {
    title: "MicroMind | Pay-per-thought AI",
    description: "AI Tools That Cost What You Actually Use. No subscriptions. Just CELO.",
    url: "https://micromind-three.vercel.app",
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
    title: "MicroMind | AI That Costs What You Use",
    description: "Premium AI journaling tools on Celo. Pay per prompt with cUSD. No subscriptions.",
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
        className={`${playfair.variable} ${dmMono.variable} antialiased selection:bg-accent selection:text-bg`}
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
