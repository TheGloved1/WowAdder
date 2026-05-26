import { cn } from '@/lib/utils';

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot='input'
      className={cn(
        'file:text-wow-text-dim placeholder:text-wow-text-muted selection:bg-wow-border-gold/20 border-wow-border-light bg-wow-panel text-wow-text-dim focus-visible:border-wow-border-gold hover:border-wow-border-gold/50 flex w-full min-w-0 rounded-sm border px-3 py-1.5 text-sm shadow-xs transition-colors outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus-visible:ring-wow-border-gold/20 focus-visible:ring-offset-wow-bg focus-visible:ring-2 focus-visible:ring-offset-2',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
