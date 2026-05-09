import React from 'react';

export function Logo({ className = "h-[20px] w-auto" }: { className?: string }) {
  const gradientId = "logo-gradient-unique";
  return (
    <div className="flex items-center gap-3">
      <svg 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C9A84C" />
            <stop offset="100%" stopColor="#E8E0CC" />
          </linearGradient>
        </defs>
        
        <circle cx="12" cy="12" r="2.5" fill={`url(#${gradientId})`} />
        
        <line x1="14.5" y1="10.5" x2="19" y2="8" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="square" />
        <line x1="14.5" y1="13.5" x2="19" y2="16" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="square" />
        <line x1="9.5" y1="13.5" x2="5" y2="16" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="square" />
        <line x1="9.5" y1="10.5" x2="5" y2="8" stroke={`url(#${gradientId})`} strokeWidth="1.5" strokeLinecap="square" />
        
        <path 
          d="M12 14.5L10 18L13 18L11 22" 
          stroke={`url(#${gradientId})`} 
          strokeWidth="1.5" 
          strokeLinecap="square" 
          strokeLinejoin="miter" 
        />
      </svg>
      <span className="font-serif text-[18px] font-normal tracking-tight text-accent-gold leading-none">
        MicroMind
      </span>
    </div>
  );
}
