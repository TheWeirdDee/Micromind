'use client';

import { useState, useEffect } from 'react';
import { OnboardingWizard } from './OnboardingWizard';

interface AppContentWrapperProps {
  children: React.ReactNode;
}

export function AppContentWrapper({ children }: AppContentWrapperProps) {
  const [onboardingCompleted, setOnboardingCompleted] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const completed = localStorage.getItem('mm_onboarding_completed') === 'true';
      setOnboardingCompleted(completed);
    }
  }, []);

  // Show a loading/pulse state while reading local storage to prevent any UI flashes
  if (onboardingCompleted === null) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 rounded-full border border-border border-t-accent animate-spin" />
        <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest">Loading Mind...</span>
      </div>
    );
  }

  if (!onboardingCompleted) {
    return <OnboardingWizard onComplete={() => setOnboardingCompleted(true)} />;
  }

  return <>{children}</>;
}
