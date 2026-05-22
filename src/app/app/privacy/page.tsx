import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="space-y-10 animate-fade-up">
      <header className="flex items-center gap-4">
        <Link href="/app/settings" className="p-2 bg-surface border border-border rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <div>
          <h2 className="text-4xl font-serif tracking-tight">Privacy</h2>
          <p className="text-text-muted font-mono text-sm mt-2">How we handle your data.</p>
        </div>
      </header>

      <section className="bg-surface border border-border p-8 rounded-[2rem] space-y-6 text-text-primary leading-relaxed">
        <div className="space-y-4">
          <h3 className="font-mono text-lg tracking-wider text-accent">1. Data Collection</h3>
          <p className="text-sm text-text-muted">
            MicroMind respects your privacy. We only collect the minimal amount of data necessary to provide our AI services and facilitate blockchain transactions. We do not store your private keys or sensitive wallet information.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-lg tracking-wider text-accent">2. Use of Information</h3>
          <p className="text-sm text-text-muted">
            Your prompts and interactions with our AI agents are processed securely. We use this information solely to generate the requested content and improve the quality of our service.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-lg tracking-wider text-accent">3. Blockchain Data</h3>
          <p className="text-sm text-text-muted">
            Please be aware that transactions made on the Celo blockchain are public and immutable. While we do our best to protect your off-chain data, your on-chain activities (including payments) are visible to anyone on the network.
          </p>
        </div>

        <div className="space-y-4">
          <h3 className="font-mono text-lg tracking-wider text-accent">4. Changes to Policy</h3>
          <p className="text-sm text-text-muted">
            We reserve the right to modify this privacy policy at any time. We encourage you to review this page periodically for any updates.
          </p>
        </div>
      </section>

      <div className="text-center pt-10 pb-8">
        <p className="font-mono text-[10px] tracking-widest uppercase text-text-muted opacity-30">
          Last Updated: May 2026
        </p>
      </div>
    </div>
  );
}
