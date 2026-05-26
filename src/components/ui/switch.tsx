import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot='switch'
      className={cn(
        'peer border-wow-border-light data-[state=checked]:bg-wow-gold data-[state=checked]:border-wow-border-gold-bright bg-wow-bg focus-visible:border-wow-border-gold focus-visible:ring-wow-border-gold/20 focus-visible:ring-offset-wow-bg inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:shadow-[0_0_6px_rgba(251,191,36,0.15)]',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot='switch-thumb'
        className={cn(
          'bg-wow-panel pointer-events-none block h-3.5 w-3.5 rounded-full shadow-sm ring-0 transition-transform duration-200 data-[state=checked]:translate-x-4.5 data-[state=unchecked]:translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
