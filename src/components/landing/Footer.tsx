'use client';

import Link from 'next/link';
import Image from 'next/image';

export function Footer() {
  return (
    <footer className="bg-surface border-t border-border pt-16 px-6 pb-0 overflow-hidden relative">
      <div className="container mx-auto max-w-6xl relative z-10">

        {/* -- Main columns -- */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 pb-12 border-b border-border">

          {/* Brand — 2 cols */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-2">
              <Image src="/logo.svg" alt="MicroMind" width={20} height={20} />
              <span className="font-serif text-xl text-text-primary tracking-tight">MicroMind</span>
            </div>
            <p className="font-mono text-[11px] text-text-muted leading-relaxed max-w-xs">
              Your thoughts deserve a safe home. Journal freely, reflect deeply, and grow with AI-powered insights — built on Celo for everyone.
            </p>
          </div>

          {/* About Us */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-text-muted font-bold">
              About Us
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/#how-it-works" className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors">
                  How It Works
                </Link>
              </li>
              <li>
                <Link href="/#tools" className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors">
                  AI Tools
                </Link>
              </li>
              <li>
                <Link href="/#faq" className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <a
                  href="https://celoscan.io/address/0xDdf2E45be95B416fE5E704073B3E3f0fB75D214c"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Smart Contract
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-text-muted font-bold">
              Legal
            </h4>
            <ul className="space-y-3">
              <li>
                <Link href="/privacy" className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms" className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors">
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>

          {/* Keep In Touch */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-text-muted font-bold">
              Keep In Touch
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/TheWeirdDee/Micromind/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Report an Issue
                </a>
              </li>
              <li>
                <a
                  href="https://celo.org"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Celo Network
                </a>
              </li>
              <li>
                <a
                  href="https://talentprotocol.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Talent Protocol
                </a>
              </li>
            </ul>
          </div>

          {/* Follow Us */}
          <div className="space-y-4">
            <h4 className="font-mono text-[10px] uppercase tracking-widest text-text-muted font-bold">
              Follow Us
            </h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="https://github.com/TheWeirdDee/Micromind"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  MicroMind on GitHub
                </a>
              </li>
              <li>
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors"
                >
                  Twitter / X
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* -- Bottom bar -- */}
        <div className="pt-8 pb-8 flex flex-col md:flex-row justify-between items-center gap-4">
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

      {/* -- Watermark wordmark - absolute, sits behind content -- */}
      <div className="absolute bottom-0 inset-x-0 overflow-hidden leading-none select-none pointer-events-none z-0" aria-hidden>
        <p
          className="text-text-primary whitespace-nowrap text-center font-bold"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(72px, 13vw, 200px)', opacity: 0.05, lineHeight: 0.9 }}
        >
          MicroMind
        </p>
      </div>
    </footer>
  );
}
