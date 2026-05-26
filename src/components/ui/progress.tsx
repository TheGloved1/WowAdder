import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn } from '@/lib/utils';

function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root
      data-slot='progress'
      className={cn(
        'bg-wow-panel border-wow-border-gold/30 relative h-2 w-full overflow-hidden rounded-sm border',
        className,
      )}
      {...props}
    >
      <ProgressPrimitive.Indicator
        data-slot='progress-indicator'
        className='from-wow-border-gold to-wow-gold h-full w-full flex-1 bg-linear-to-r transition-all duration-300'
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };
