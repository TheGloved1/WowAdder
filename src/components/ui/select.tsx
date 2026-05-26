import * as SelectPrimitive from '@radix-ui/react-select';
import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils';

function Select({ children, ...props }: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props}>{children}</SelectPrimitive.Root>;
}

function SelectTrigger({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger
      data-slot='select-trigger'
      className={cn(
        'border-wow-border-light data-[placeholder]:text-wow-text-muted bg-wow-panel text-wow-text-dim hover:border-wow-border-gold/50 focus:border-wow-border-gold flex w-fit items-center gap-2 rounded-sm border px-2.5 py-1.5 text-xs whitespace-nowrap shadow-xs transition-colors outline-none focus:ring-0 disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0',
        className,
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className='text-wow-text-muted size-3.5' />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = 'popper',
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        data-slot='select-content'
        className={cn(
          'bg-wow-panel border-wow-border-light text-wow-text-dim data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-64 min-w-[8rem] overflow-hidden rounded-sm border shadow-md',
          position === 'popper' &&
            'data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1',
          className,
        )}
        position={position}
        {...props}
      >
        <SelectPrimitive.Viewport
          className={cn(
            'p-1',
            position === 'popper' &&
              'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]',
          )}
        >
          {children}
        </SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      data-slot='select-item'
      className={cn(
        'focus:bg-wow-panel-hover focus:text-wow-text data-[state=checked]:text-wow-gold relative flex w-full cursor-pointer items-center rounded-sm py-1.5 pr-8 pl-2 text-xs outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<typeof SelectPrimitive.Separator>) {
  return (
    <SelectPrimitive.Separator
      data-slot='select-separator'
      className={cn('bg-wow-border-light -mx-1 my-1 h-px', className)}
      {...props}
    />
  );
}

export { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger };
