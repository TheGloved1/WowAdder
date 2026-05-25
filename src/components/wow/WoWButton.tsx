import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface WoWButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export default function WoWButton({ children, variant = 'default', size = 'sm', className = '', ...props }: WoWButtonProps) {
  const base =
    'relative inline-flex items-center justify-center gap-1.5 font-wow-heading tracking-wide transition-all duration-150 select-none';

  const sizes: Record<string, string> = {
    sm: 'text-xs px-3 py-1.5',
    md: 'text-sm px-4 py-2',
    lg: 'text-base px-6 py-2.5',
  };

  const variants: Record<string, string> = {
    default:
      'text-wow-text-dim hover:text-wow-text bg-wow-panel border border-wow-border-light hover:border-wow-border-gold hover:shadow-[0_0_8px_rgba(161,98,7,0.2)]',
    primary:
      'text-wow-bg bg-wow-gold border border-wow-border-gold-bright hover:bg-wow-gold/90 active:bg-wow-gold-dim shadow-[0_0_6px_rgba(251,191,36,0.15)]',
    danger: 'text-wow-text bg-wow-danger/20 border border-wow-danger/40 hover:bg-wow-danger/30 hover:border-wow-danger/60',
    ghost: 'text-wow-text-dim hover:text-wow-gold bg-transparent border border-transparent hover:border-wow-border-gold/50',
  };

  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} rounded-sm ${className}`} {...props}>
      {children}
    </button>
  );
}
