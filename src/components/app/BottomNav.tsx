'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, MessageSquare, History, ArrowUp } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function BottomNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: Home, label: 'Home', href: '/app' },
    { icon: BookOpen, label: 'Journal', href: '/app/journal' },
    { icon: MessageSquare, label: 'Chat', href: '/app/chat' },
    { icon: ArrowUp, label: 'Send', href: '/app/send' },
    { icon: History, label: 'History', href: '/app/history' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-center px-6 pb-8 pointer-events-none">
      <div className="bg-surface/80 backdrop-blur-xl border border-border rounded-full px-4 py-3 flex gap-2 pointer-events-auto shadow-2xl">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
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
