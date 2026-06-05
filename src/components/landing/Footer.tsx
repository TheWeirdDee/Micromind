'use client';

import Link from 'next/link';

export function Footer() {
  return (
    <footer className="py-20 px-6 border-t border-border bg-bg text-left">
      <div className="container mx-auto max-w-6xl">
        {/* Main Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 lg:gap-8 pb-16">
          
          {/* Column 1 — Brand info (4 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <span className="font-serif text-2xl text-text-primary tracking-tight">MicroMind</span>
            <p className="font-mono text-xs text-text-muted leading-relaxed max-w-sm">
              Your thoughts deserve a safe, private home. Local-first journaling enhanced by pay-per-prompt AI on Celo. No monthly subscription commitments, ever.
            </p>
          </div>

          {/* Column 2 — Product Features (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-mono text-[10px] tracking-widest uppercase text-accent-gold font-bold">Product</h4>
            <ul className="space-y-2.5 font-mono text-[11px] text-text-muted">
              <li>
                <Link href="/app/journal" className="hover:text-accent transition-colors">Journal (Free)</Link>
              </li>
              <li>
                <Link href="/app/reflect" className="hover:text-accent transition-colors">AI Reflect</Link>
              </li>
              <li>
                <Link href="/app/pattern" className="hover:text-accent transition-colors">Pattern Analyst</Link>
              </li>
              <li>
                <Link href="/app/letter" className="hover:text-accent transition-colors">Heartfelt Letters</Link>
              </li>
            </ul>
          </div>

          {/* Column 3 — Privacy Highlights (2.5 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="font-mono text-[10px] tracking-widest uppercase text-accent-gold font-bold">Privacy by Design</h4>
            <ul className="space-y-2.5 font-mono text-[11px] text-text-muted">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span>On-Device Storage</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span>Zero Cloud Databases</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span>No User Tracking</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-accent-green" />
                <span>Onchain Transaction Audits</span>
              </li>
            </ul>
          </div>

          {/* Column 4 — Resources & Links (2.5 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="font-mono text-[10px] tracking-widest uppercase text-accent-gold font-bold">Developers</h4>
            <ul className="space-y-2.5 font-mono text-[11px] text-text-muted">
              <li>
                <a href="https://celo.org" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Celo Network</a>
              </li>
              <li>
                <a href="https://talentprotocol.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Talent Protocol</a>
              </li>
              <li>
                <a href="https://celoscan.io/address/0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">Smart Contract</a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom row — Copyright & Badge */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[10px] text-text-muted">
            © 2026 MicroMind. All rights reserved.
          </p>

          <div className="flex items-center gap-2 bg-accent-green/5 border border-accent-green/20 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-accent-green animate-pulse" />
            <span className="font-mono text-[9px] uppercase tracking-wider text-accent-green font-bold">
              Built on Celo for MiniPay
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
