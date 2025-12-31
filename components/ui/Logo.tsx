import React from 'react';

export const Logo: React.FC<{ className?: string }> = ({ className }) => {
  return (
    <svg 
      viewBox="0 0 40 40" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <rect x="4" y="4" width="32" height="32" rx="8" stroke="currentColor" strokeWidth="2.5" />
      <path d="M12 20H28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M20 12V28" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy="20" r="4" stroke="currentColor" strokeWidth="2.5" fill="none" />
    </svg>
  );
};