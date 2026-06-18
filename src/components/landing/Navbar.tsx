'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Logo } from '@/components/brand/Logo';
import { ArrowRight, Menu, X } from 'lucide-react';

const MOBILE_LINKS = [
  { href: '#', label: 'Home' },
  { href: '#about', label: 'About' },
  { href: '#features', label: 'Features' },
  { href: '#companions', label: 'Companions' },
];

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
          className="pill-button pill-button-outline group text-xs py-2 px-5 hidden sm:inline-flex"
        >
          Explore App
          <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
        </Link>

        <button
          onClick={() => setMenuOpen(!menuOpen)}
          className="md:hidden p-2 text-text-primary"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
        >
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {menuOpen && (
        <div className="md:hidden glass border-t border-border mt-2 py-4 px-6 flex flex-col gap-4">
          {MOBILE_LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMenuOpen(false)}
              className="font-mono text-xs tracking-widest uppercase text-text-primary/70 hover:text-accent transition-colors"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="/app"
            onClick={() => setMenuOpen(false)}
            className="pill-button pill-button-outline group text-xs py-2 px-5 w-fit"
          >
            Explore App
            <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
        </div>
      )}
    </nav>
  );
}
