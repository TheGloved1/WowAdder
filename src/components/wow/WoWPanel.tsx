import type { ReactNode } from 'react';

interface WoWPanelProps {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'section' | 'article' | 'aside';
}

export default function WoWPanel({ children, className = '', as: Tag = 'div' }: WoWPanelProps) {
  return (
    <Tag
      className={`bg-wow-panel border-wow-border-light before:border-wow-border-gold/30 relative rounded-sm border before:pointer-events-none before:absolute before:inset-[1px] before:rounded-sm before:border ${className}`}
    >
      {children}
    </Tag>
  );
}
