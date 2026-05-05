import React from 'react';

export function Logo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Minimalist, sharp abstract 'M' / Neural path */}
      <path 
        d="M4 18V6L12 14L20 6V18" 
        stroke="#E8E0CC" 
        strokeWidth="2.5" 
        strokeLinecap="square" 
        strokeLinejoin="miter"
      />
      {/* Subtle node indicator */}
      <circle cx="12" cy="17" r="1.5" fill="#E8E0CC" />
    </svg>
  );
}
