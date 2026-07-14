import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Scale, BookOpen, AlertTriangle } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow bg-bg py-24 md:py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 halftone-bg opacity-20 pointer-events-none" />
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-accent-gold/3 rounded-full filter blur-3xl pointer-events-none" />
        
        <div className="container mx-auto max-w-3xl relative z-10 text-left space-y-10">
          
          {/* Header */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-accent-gold/10 border border-accent-gold/20 rounded-xl text-accent-gold font-mono text-[10px] uppercase tracking-wider">
              <Scale className="w-3.5 h-3.5" />
              <span>Legal Guidelines</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-serif text-text-primary tracking-tight">
              Terms of Service
            </h1>
            <p className="font-mono text-xs text-text-muted">
              Last Updated: July 14, 2026
            </p>
          </div>

          {/* Intro Card */}
          <div className="p-6 bg-surface border border-border rounded-3xl space-y-3">
            <h3 className="font-serif text-lg text-text-primary flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-accent" /> Acceptable Use & Autonomy
            </h3>
            <p className="font-mono text-xs text-text-muted leading-relaxed">
              By using MicroMind, connecting your wallet, or participating in the Clarity Quest and daily staking challenges, you agree to these Terms of Service. If you do not agree, please discontinue using the application.
            </p>
          </div>

          {/* Terms Content */}
          <div className="space-y-8 font-mono text-xs text-text-muted leading-relaxed">
            
            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                1. Service Model and Micropayments
              </h2>
              <p>
                MicroMind operates a pay-per-use model using Celo USDm stablecoins. 
                Certain interactive AI features, such as generating Weekly Reflections, analyzing patterns, or unlocking Clarity Cards, incur small on-chain fees (typically 0.005 USDm). 
                All transaction confirmations are finalized on-chain and cannot be reversed.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                2. 30-Day Staking Challenges
              </h2>
              <p>
                When participating in a 30-Day Staking Challenge:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You agree to lock the specified USDm stake (0.05 USDm) into the verified smart contract.</li>
                <li>Stakes are only reclaimable upon completing the daily journaling check-in requirements.</li>
                <li>Failure to complete check-ins within the allotted challenge windows may result in the forfeiture of your staked funds to the global reward distribution pool, governed by smart contract logic.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                3. User Content & Local Storage
              </h2>
              <p>
                Your journal entries are written in a local browser database (IndexedDB) and encrypted client-side. 
                You are solely responsible for keeping backup escrows. 
                Because we do not store unencrypted copies of your database, we cannot recover keys, passwords, or encrypted logs if you delete your local cache.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                4. Disclaimer of Advice
              </h2>
              <div className="flex gap-3 bg-red-950/15 border border-red-500/20 p-4 rounded-2xl text-red-400">
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>No Medical or Clinical Advice:</strong> MicroMind and its AI companions are cognitive reflection aids designed to help you organize thoughts using CBT paradigms. They are NOT diagnostic tools, therapy, or medical services. Do not use this service in a crisis.
                </p>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-sm font-serif text-text-primary font-bold uppercase tracking-wider">
                5. Modification & Termination
              </h2>
              <p>
                We reserve the right to update these terms or deploy updated smart contracts to Celo Alfajores or Mainnet. Continued use of the app constitutes agreement to any subsequent changes.
              </p>
            </section>

          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}
