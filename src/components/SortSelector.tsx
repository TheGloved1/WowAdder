import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';

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
      <Select value={JSON.stringify(value)} onValueChange={(v) => onChange(JSON.parse(v))}>
        <SelectTrigger className='w-[140px]'>
          <span>{value.label}</span>
        </SelectTrigger>
        <SelectContent>
          {SORT_OPTIONS.map((opt) => (
            <SelectItem key={opt.label} value={JSON.stringify(opt)}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
