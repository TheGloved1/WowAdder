import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'text-wow-text-dim border-wow-border-light bg-wow-panel',
        info: 'text-wow-gold border-wow-border-gold/30 bg-wow-border-gold/10',
        release: 'text-wow-quality-blue border-wow-quality-blue/30 bg-wow-quality-blue/10',
        beta: 'text-wow-quality-green border-wow-quality-green/30 bg-wow-quality-green/10',
        alpha: 'text-wow-danger border-wow-danger/30 bg-wow-danger/10',
        installed: 'text-wow-quality-purple border-wow-quality-purple/30 bg-wow-quality-purple/10',
        class: 'text-wow-quality-orange border-wow-quality-orange/30 bg-wow-quality-orange/10',
        outline: 'border border-wow-border-light bg-transparent text-wow-text-dim',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
