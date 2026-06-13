'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Logo } from '@/components/brand/Logo';
import { ArrowRight } from 'lucide-react';

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

        <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2">
          <a href="#" className="font-mono text-[10px] tracking-widest uppercase text-text-primary/70 hover:text-accent transition-colors">
            Home
          </a>
          <a href="#about" className="font-mono text-[10px] tracking-widest uppercase text-text-primary/70 hover:text-accent transition-colors">
            About
          </a>
          <a href="#features" className="font-mono text-[10px] tracking-widest uppercase text-text-primary/70 hover:text-accent transition-colors">
            Features
          </a>
          <a href="#companions" className="font-mono text-[10px] tracking-widest uppercase text-text-primary/70 hover:text-accent transition-colors">
            Companions
          </a>
        </div>
        
        <Link 
          href="/app" 
          className="pill-button pill-button-outline group text-xs py-2 px-5"
        >
          Explore App
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      </div>
    </nav>
  );
}
