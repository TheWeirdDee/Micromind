'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, MessageSquare, History, ArrowUp, Trophy } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function BottomNav() {
  const pathname = usePathname();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const handleFocus = () => {
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.getAttribute('contenteditable') === 'true')
      ) {
        setIsKeyboardOpen(true);
      }
    };
    const handleBlur = () => {
      // Small timeout to prevent flickering when transitioning focus
      setTimeout(() => {
        const activeEl = document.activeElement;
        if (
          !activeEl ||
          (activeEl.tagName !== 'INPUT' && activeEl.tagName !== 'TEXTAREA' && activeEl.getAttribute('contenteditable') !== 'true')
        ) {
          setIsKeyboardOpen(false);
        }
      }, 50);
    };

    document.addEventListener('focusin', handleFocus);
    document.addEventListener('focusout', handleBlur);
    return () => {
      document.removeEventListener('focusin', handleFocus);
      document.removeEventListener('focusout', handleBlur);
    };
  }, []);

  const navItems = [
    { icon: Home, label: 'Home', href: '/app' },
    { icon: BookOpen, label: 'Journal', href: '/app/journal' },
    { icon: Trophy, label: 'Quest', href: '/app/quest' },
    { icon: MessageSquare, label: 'Chat', href: '/app/chat' },
    { icon: ArrowUp, label: 'Send', href: '/app/send' },
    { icon: History, label: 'History', href: '/app/history' },
  ];

  if (isKeyboardOpen) return null;

  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-6 pb-8 pointer-events-none">
      <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-full px-4 py-3 flex gap-2 pointer-events-auto shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                "p-3 rounded-full transition-all duration-300 relative group",
                isActive ? "bg-accent text-bg" : "text-text-muted hover:text-text-primary hover:bg-surface-2"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="absolute -top-10 left-1/2 -translate-x-1/2 bg-surface border border-border text-[10px] px-2 py-1 rounded font-mono opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
