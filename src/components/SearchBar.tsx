import { Input } from '@/components/ui/input';

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
        <svg
          className='text-wow-text-muted absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2'
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
          />
        </svg>
        <Input
          type='text'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder='Search addons...'
          className='py-2 pr-4 pl-10'
        />
      </div>
    </form>
  );
}
