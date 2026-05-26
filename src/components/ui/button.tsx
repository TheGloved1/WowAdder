import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm font-wow-heading tracking-wide select-none transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default:
          'text-wow-text-dim hover:text-wow-text bg-wow-panel border border-wow-border-light hover:border-wow-border-gold hover:shadow-[0_0_8px_rgba(161,98,7,0.2)]',
        primary:
          'text-wow-bg bg-wow-gold border border-wow-border-gold-bright hover:bg-wow-gold/90 active:bg-wow-gold-dim shadow-[0_0_6px_rgba(251,191,36,0.15)]',
        destructive:
          'text-wow-text bg-wow-danger/20 border border-wow-danger/40 hover:bg-wow-danger/30 hover:border-wow-danger/60',
        outline:
          'text-wow-text-dim bg-transparent border border-wow-border-light hover:border-wow-border-gold hover:text-wow-text',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost:
          'text-wow-text-dim hover:text-wow-gold bg-transparent border border-transparent hover:border-wow-border-gold/50',
        link: 'text-wow-gold underline-offset-4 hover:underline',
      },
      size: {
        default: 'text-xs px-3 py-1.5',
        sm: 'text-xs px-2.5 py-1',
        md: 'text-sm px-4 py-2',
        lg: 'text-base px-6 py-2.5',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = 'Button';

export { Button, buttonVariants };
