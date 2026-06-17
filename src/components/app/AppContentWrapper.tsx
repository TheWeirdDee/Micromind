'use client';

import { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { AuthModal } from '@/components/auth/AuthModal';

interface AppContentWrapperProps {
  children: React.ReactNode;
}

export function AppContentWrapper({ children }: AppContentWrapperProps) {
  const { user, loading } = useAuth();
  const [showReminder, setShowReminder] = useState(false);

  useEffect(() => {
    if (!user || typeof window === 'undefined') return;

    const remindersEnabled = localStorage.getItem('mm_daily_reminder') === 'true';
    if (!remindersEnabled) return;

    const dismissedToday = localStorage.getItem('mm_reminder_dismissed') === new Date().toDateString();
    if (dismissedToday) return;

    try {
      const entries = JSON.parse(localStorage.getItem('mm_journal') || '[]');
      if (entries.length === 0) { setShowReminder(true); return; }
      const newestTimestamp = Math.max(...entries.map((e: any) => e.timestamp || 0));
      if ((Date.now() - newestTimestamp) / (1000 * 60 * 60) > 24) setShowReminder(true);
    } catch { /* ignore */ }
  }, [user]);

  const dismissReminder = () => {
    localStorage.setItem('mm_reminder_dismissed', new Date().toDateString());
    setShowReminder(false);
  };

  if (loading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border border-border border-t-accent animate-spin" />
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Loading Mind...</span>
      </div>
    );
  }

  if (!user) {
    return <AuthModal />;
  }

  return (
    <>
      {children}
      {showReminder && (
        <div className="fixed bottom-24 right-4 left-4 sm:left-auto sm:w-80 bg-surface border border-accent/40 rounded-2xl p-4 shadow-xl shadow-accent/5 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="flex gap-3">
            <div className="p-2 bg-accent/10 rounded-xl h-fit">
              <Bell className="w-4 h-4 text-accent" />
            </div>
            <div className="flex-1">
              <h4 className="font-serif text-sm">Time to reflect?</h4>
              <p className="text-xs text-text-muted font-mono mt-1">You haven't journaled yet today. Want to take 2 minutes?</p>
              <div className="flex items-center gap-3 mt-3">
                <Link href="/app/journal" onClick={dismissReminder} className="text-xs font-mono font-bold text-bg bg-accent px-3 py-1.5 rounded-lg">
                  Write now
                </Link>
                <button onClick={dismissReminder} className="text-xs font-mono text-text-muted hover:text-text-primary transition-colors">
                  Later
                </button>
              </div>
            </div>
            <button onClick={dismissReminder} className="h-fit p-1 text-text-muted hover:text-text-primary transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
