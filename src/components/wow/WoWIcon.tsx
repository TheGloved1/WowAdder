import type { ReactNode } from 'react';

interface WoWIconFrameProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function WoWIconFrame({ children, size = 'md', className = '' }: WoWIconFrameProps) {
  const sizes: Record<string, string> = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
  };

  return (
    <div
      className={`${sizes[size]} bg-wow-panel border-wow-border-light before:border-wow-border-gold/20 relative shrink-0 overflow-hidden rounded-sm border before:pointer-events-none before:absolute before:inset-[1px] before:rounded-sm before:border ${className}`}
    >
      {children}
    </div>
  );
}
