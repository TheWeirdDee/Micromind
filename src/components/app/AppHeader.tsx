'use client';

import { WalletBadge } from './WalletBadge';
import Link from 'next/link';

export function AppHeader() {
  return (
    <header className="fixed top-0 left-0 right-0 z-40 bg-bg/80 backdrop-blur-md border-b border-border">
      <div className="max-w-[430px] mx-auto px-6 py-4 flex justify-between items-center">
        <Link href="/app" className="font-serif text-lg text-text-primary tracking-tight">
          MicroMind
        </Link>
        <WalletBadge />
      </div>
    </header>
  );
}
