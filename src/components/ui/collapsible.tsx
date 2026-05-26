import * as CollapsiblePrimitive from '@radix-ui/react-collapsible';

import { cn } from '@/lib/utils';

function Collapsible({ ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Root>) {
  return <CollapsiblePrimitive.Root data-slot='collapsible' {...props} />;
}

function CollapsibleTrigger({ className, children, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Trigger>) {
  return (
    <CollapsiblePrimitive.Trigger
      data-slot='collapsible-trigger'
      className={cn(
        'font-wow-heading text-wow-text-dim hover:text-wow-gold flex w-full items-center justify-between gap-2 text-xs tracking-wider uppercase transition-colors',
        className,
      )}
      {...props}
    >
      {children}
    </CollapsiblePrimitive.Trigger>
  );
}

function CollapsibleContent({ className, ...props }: React.ComponentProps<typeof CollapsiblePrimitive.Content>) {
  return (
    <CollapsiblePrimitive.Content
      data-slot='collapsible-content'
      className={cn(
        'data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

export { Collapsible, CollapsibleContent, CollapsibleTrigger };
