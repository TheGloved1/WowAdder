import type { ReactNode } from 'react';

interface WoWBadgeProps {
  children: ReactNode;
  variant?: 'release' | 'beta' | 'alpha' | 'installed' | 'default' | 'info' | 'class';
}

export default function WoWBadge({ children, variant = 'default' }: WoWBadgeProps) {
  const styles: Record<string, string> = {
    release: 'text-wow-quality-blue border-wow-quality-blue/30 bg-wow-quality-blue/10',
    beta: 'text-wow-quality-green border-wow-quality-green/30 bg-wow-quality-green/10',
    alpha: 'text-wow-danger border-wow-danger/30 bg-wow-danger/10',
    installed: 'text-wow-quality-purple border-wow-quality-purple/30 bg-wow-quality-purple/10',
    default: 'text-wow-text-dim border-wow-border-light bg-wow-panel',
    info: 'text-wow-gold border-wow-border-gold/30 bg-wow-border-gold/10',
    class: 'text-wow-quality-orange border-wow-quality-orange/30 bg-wow-quality-orange/10',
  };

  return <span className={`rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${styles[variant]}`}>{children}</span>;
}
