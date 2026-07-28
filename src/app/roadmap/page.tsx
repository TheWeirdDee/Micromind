import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import {
  Map, Anchor, LogIn, Mail, Trophy, Search, FileDown, Award,
} from "lucide-react";

interface RoadmapItem {
  icon: typeof Anchor;
  title: string;
  status: string;
  description: string;
}

const ITEMS: RoadmapItem[] = [
  {
    icon: Anchor,
    title: "Save your journal onchain",
    status: "Planned · Paid",
    description:
      "A verifiable, tamper-proof record that an entry existed at a point in time — without putting your writing itself on a public ledger. Your entry stays encrypted and off-chain; only a proof of it gets anchored to Celo.",
  },
  {
    icon: LogIn,
    title: "Social login",
    status: "Planned",
    description:
      "Sign up with Google (more providers after) instead of email and password — mainly for the regular-web sign-up flow, since MiniPay already gets a fast wallet-based entry point.",
  },
  {
    icon: Mail,
    title: "Escrow Letters: one free per month",
    status: "Planned · Pricing change",
    description:
      "Scheduling a letter to your future self is free today. Going forward, your first scheduled letter each month stays free — additional ones in the same month carry a small fee.",
  },
  {
    icon: Trophy,
    title: "More Clarity Quest content",
    status: "Planned",
    description:
      "More word categories and stages for the Clarity Quest vocabulary game.",
  },
  {
    icon: Search,
    title: "Search your journal",
    status: "Planned",
    description:
      "Find an entry by keyword instead of scrolling through folders.",
  },
  {
    icon: FileDown,
    title: "Readable export (Markdown / PDF)",
    status: "Planned",
    description:
      "Settings already lets you export a raw JSON backup — a readable Markdown or PDF export is next, for actually reading or printing your entries elsewhere.",
  },
  {
    icon: Award,
    title: "Onchain achievement badges",
    status: "Exploring",
    description:
      "Verifiable, collectible badges for Clarity Quest milestones — streaks and level completions you actually own, not just a number in a database.",
  },
];

export default function RoadmapPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-grow bg-bg py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-3xl relative z-10 text-left space-y-10">

          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl text-accent font-mono text-[10px] uppercase tracking-wider">
              <Map className="w-3.5 h-3.5" />
              <span>Roadmap</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-text-primary tracking-tight">
              What&apos;s next
            </h1>
            <p className="font-mono text-xs text-text-muted leading-relaxed max-w-xl">
              What we&apos;re planning, honestly labeled — nothing below is built yet.
              No firm dates, since we&apos;d rather ship it right than ship it on time.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {ITEMS.map((item) => (
              <div
                key={item.title}
                className="p-6 bg-surface border border-border rounded-3xl space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-2xl bg-accent/10 flex items-center justify-center shrink-0">
                    <item.icon className="w-4 h-4 text-accent" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base text-text-primary leading-tight">{item.title}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-wider text-accent-gold">{item.status}</span>
                  </div>
                </div>
                <p className="font-mono text-xs text-text-muted leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>

          <div className="p-6 bg-surface border border-border rounded-3xl">
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              Have a feature you want to see, or feedback on one of these?{" "}
              <a href="/contact" className="text-accent-gold hover:underline">Reach out</a> — this list changes based on what people actually ask for.
            </p>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
