import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: () => void;
}

export default function SearchBar({ value, onChange, onSearch }: SearchBarProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch();
      }}
      className='max-w-xl flex-1'
    >
      <div className='relative'>
        <Search className='text-wow-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
        {value && (
          <button
            type='button'
            onClick={() => {
              onChange('');
              onSearch();
            }}
            className='text-wow-text-muted hover:text-wow-text absolute top-1/2 right-3 -translate-y-1/2'
            aria-label='Clear search'
          >
            <svg className='h-4 w-4' viewBox='0 0 24 24' fill='none' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
            </svg>
          </button>
        )}
        <Input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Search addons...'
          className={`py-2 ${value ? 'pr-10' : 'pr-4'} pl-10`}
        />
      </div>
    </form>
  );
}
