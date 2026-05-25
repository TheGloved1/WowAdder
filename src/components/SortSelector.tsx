export interface SortOption {
  label: string;
  field: number;
  order: 'asc' | 'desc';
}

export const SORT_OPTIONS: SortOption[] = [
  { label: 'Most Downloads', field: 6, order: 'desc' },
  { label: 'Most Popular', field: 2, order: 'desc' },
  { label: 'Recently Updated', field: 3, order: 'desc' },
  { label: 'Name (A-Z)', field: 4, order: 'asc' },
  { label: 'Name (Z-A)', field: 4, order: 'desc' },
];

interface SortSelectorProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

export default function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div className='flex items-center gap-1.5'>
      <label className='text-wow-text-muted font-wow-heading shrink-0 text-xs tracking-wider uppercase'>Sort:</label>
      <select
        value={SORT_OPTIONS.findIndex((o) => o.field === value.field && o.order === value.order)}
        onChange={(e) => onChange(SORT_OPTIONS[Number(e.target.value)])}
        className='bg-wow-panel border-wow-border-light text-wow-text-dim focus:border-wow-border-gold hover:border-wow-border-gold/50 cursor-pointer appearance-none rounded-sm border px-2.5 py-1.5 text-xs transition-colors focus:outline-none'
      >
        {SORT_OPTIONS.map((opt, i) => (
          <option key={i} value={i}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
