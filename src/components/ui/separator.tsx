import * as SeparatorPrimitive from '@radix-ui/react-separator';
import * as React from 'react';

import { cn } from '@/lib/utils';

const Separator = React.forwardRef<
  React.ElementRef<typeof SeparatorPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
>(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
  <SeparatorPrimitive.Root
    ref={ref}
    decorative={decorative}
    orientation={orientation}
    className={cn('shrink-0', orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', className)}
    {...props}
  />
));
Separator.displayName = SeparatorPrimitive.Root.displayName;

function WoWSeparator({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className='via-wow-border-gold/40 via-wow-border-gold/20 h-px flex-1 bg-gradient-to-r from-transparent to-transparent' />
      <div className='border-wow-border-gold/60 h-1.5 w-1.5 rotate-45 border' />
      <div className='via-wow-border-gold/40 via-wow-border-gold/20 h-px flex-1 bg-gradient-to-r from-transparent to-transparent' />
    </div>
  );
}

export { Separator, WoWSeparator };
