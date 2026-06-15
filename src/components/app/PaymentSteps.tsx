'use client';

import { Check, Loader2 } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface StepProps {
  label: string;
  status: 'dim' | 'active' | 'complete';
}

export function PaymentSteps({ steps }: { steps: StepProps[] }) {
  return (
    <div className="mt-8 space-y-4 px-2">
      {steps.map((step, i) => (
        <div 
          key={i} 
          className={cn(
            "flex items-center gap-4 transition-all duration-300",
            step.status === 'dim' ? "opacity-30 grayscale" : "opacity-100"
          )}
        >
          <div className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center border transition-all duration-300",
            step.status === 'complete' ? "bg-accent-green border-accent-green" : 
            step.status === 'active' ? "border-accent-gold" : "border-border"
          )}>
            {step.status === 'complete' ? (
              <Check className="w-3 h-3 text-bg" aria-label="Step complete" />
            ) : step.status === 'active' ? (
              <Loader2 className="w-3 h-3 text-accent-gold animate-spin" aria-label="Step in progress" />
            ) : (
              <div className="w-1 h-1 rounded-full bg-border" aria-label="Step pending" />
            )}
          </div>
          <span className={cn(
            "font-mono text-[10px] tracking-widest uppercase",
            step.status === 'active' ? "text-text-primary" : "text-text-muted"
          )}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  );
}
