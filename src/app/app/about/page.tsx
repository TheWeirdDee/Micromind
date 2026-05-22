import { ArrowLeft, BrainCircuit, Shield, Zap } from 'lucide-react';
import Link from 'next/link';

export default function AboutPage() {
  return (
    <div className="space-y-10 animate-fade-up">
      <header className="flex items-center gap-4">
        <Link href="/app/settings" className="p-2 bg-surface border border-border rounded-full hover:bg-white/5 transition-colors">
          <ArrowLeft className="w-5 h-5 text-text-muted" />
        </Link>
        <div>
          <h2 className="text-4xl font-serif tracking-tight">About</h2>
          <p className="text-text-muted font-mono text-sm mt-2">The MicroMind vision.</p>
        </div>
      </header>

      <section className="bg-surface border border-border p-8 rounded-[2rem] space-y-8 text-text-primary leading-relaxed">
        
        <div className="flex flex-col items-center text-center space-y-4 mb-8">
          <div className="p-4 bg-surface-2 rounded-2xl shadow-xl">
            <BrainCircuit className="w-12 h-12 text-accent" />
          </div>
          <h3 className="font-serif text-2xl tracking-tight text-white">MicroMind</h3>
          <p className="text-sm text-text-muted max-w-[250px]">
            Decentralized Intelligence at your fingertips.
          </p>
        </div>

        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="mt-1">
              <Zap className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h4 className="font-mono text-sm tracking-wider text-white mb-2">Lightning Fast AI</h4>
              <p className="text-sm text-text-muted">
                Powered by Groq's high-speed inference engine, MicroMind delivers instant AI capabilities including chat, resume building, and content generation.
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            <div className="mt-1">
              <Shield className="w-5 h-5 text-accent-green" />
            </div>
            <div>
              <h4 className="font-mono text-sm tracking-wider text-white mb-2">Web3 Native</h4>
              <p className="text-sm text-text-muted">
                Built seamlessly on the Celo blockchain, MicroMind integrates transparently with MiniPay and utilizes USDC for friction-less AI access.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-border/50">
          <p className="text-sm text-text-muted italic text-center">
            "Empowering the next billion users with decentralized intelligence."
          </p>
        </div>
      </section>

      <div className="text-center pt-6 pb-8">
        <p className="font-mono text-[10px] tracking-widest uppercase text-text-muted opacity-30">
          MicroMind Version 2.0.0 <br />
          Built with love on Celo
        </p>
      </div>
    </div>
  );
}
