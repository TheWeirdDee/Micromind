import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Shield, Lock } from "lucide-react";

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-bg py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 left-0 w-96 h-96 bg-accent/5 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="container mx-auto max-w-3xl relative z-10 text-left space-y-10">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent/10 border border-accent/20 rounded-xl text-accent font-mono text-[10px] uppercase tracking-wider">
              <Shield className="w-3.5 h-3.5" />
              <span>Privacy First</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-text-primary tracking-tight">
              Privacy Policy
            </h1>
            <p className="font-mono text-xs text-text-muted">
              Last Updated: July 14, 2026
            </p>
          </div>

          {/* Intro Card */}
          <div className="p-6 bg-surface border border-border rounded-3xl space-y-3">
            <h3 className="font-serif text-lg text-accent-gold flex items-center gap-2">
              <Lock className="w-4 h-4" /> Our Privacy Guarantee
            </h3>
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              At MicroMind, privacy isn&apos;t a policy setting — it is our core architecture. Your journal entries are encrypted client-side directly in your browser using AES-GCM before ever leaving your device. We never harvest, profile, or sell your data.
            </p>
          </div>

          {/* Sections */}
          <div className="space-y-8 font-mono text-xs text-text-muted leading-relaxed">
            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                1. Information We Collect
              </h2>
              <p>
                Because MicroMind is built client-side and interacts with the Celo network, we do not require email accounts or personal identification to use the core journal:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Journal Entries:</strong> Saved locally in your browser&apos;s secure IndexedDB database. If synced to Supabase backup escrow, they are encrypted with your secret key before transmission.</li>
                <li><strong>Blockchain Address:</strong> When you connect a Web3 wallet (such as MiniPay or Valora), we read your public Celo address to verify prompt balances.</li>
                <li><strong>AI Inference Logs:</strong> When you query an AI companion, the request contains the context you submit. These prompts are processed statelessly and are never persisted or used to train public LLM models.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                2. How Your Data Is Secured
              </h2>
              <p>
                We leverage secure Web Cryptography APIs to generate a unique encryption key client-side. 
                Your keys remain on your device or are safely stored inside your browser session. 
                Our backend relayer and Supabase databases act only as blind, encrypted storage escrows.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                3. Third-Party Integrations
              </h2>
              <p>
                MicroMind communicates statelessly with the following services to deliver premium features:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Celo Network:</strong> For gasless Relayer transactions and micropayments.</li>
                <li><strong>Groq LLM Services:</strong> To power Clarity Card cognitive reframings and pattern analyses.</li>
                <li><strong>Resend API:</strong> To securely email encrypted Scheduled Letters.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                4. Your Rights
              </h2>
              <p>
                You hold complete ownership of your data. You can export all your journal entries as plain JSON or purge your secure IndexedDB database instantly via the application settings at any time.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                5. Contact Us
              </h2>
              <p>
                If you have questions regarding our privacy architecture, you can contact us at <a href="mailto:micromind16@gmail.com" className="text-accent-gold hover:underline">micromind16@gmail.com</a>.
              </p>
            </section>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
