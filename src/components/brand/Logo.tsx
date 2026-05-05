import React from 'react';

export function Logo({ className = "w-8 h-8" }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer Diamond/Hexagon shape */}
      <path 
        d="M12 2L20 7V17L12 22L4 17V7L12 2Z" 
        stroke="#E8E0CC" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      {/* Interior stylized 'M' / Circuit mark */}
      <path 
        d="M8 14V10L12 14L16 10V14" 
        stroke="#E8E0CC" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      <circle cx="12" cy="8" r="1" fill="#E8E0CC" />
    </svg>
  );
}
