'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Logo } from '@/components/brand/Logo';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav
      className={cn(
        'fixed top-0 left-0 w-full z-40 transition-all duration-300 border-b border-transparent',
        scrolled ? 'glass py-3' : 'py-6'
      )}
    >
      <div className="container mx-auto px-6 flex justify-between items-center relative">
        <Link href="/" className="flex items-center gap-2 group">
          <Logo className="h-[20px] w-auto group-hover:scale-105 transition-transform duration-300" />
        </Link>

        {/* Centered Tagline - Hidden on mobile */}
        <div className="hidden md:flex absolute left-1/2 -translate-x-1/2">
          <span className="font-mono text-[11px] tracking-[0.3em] uppercase text-accent-gold whitespace-nowrap">
            PAY · PER · PROMPT · NO SUBSCRIPTIONS
          </span>
        </div>
        
        <Link 
          href="/app" 
          className="pill-button pill-button-outline group"
        >
          Open App 
          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
        </Link>
      </div>
    </nav>
  );
}
