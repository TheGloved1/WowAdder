import { useRef, useState } from 'react';

interface VersionSelectorProps {
  versions: string[];
  selectedVersion: string;
  onVersionChange: (version: string) => void;
  loading?: boolean;
}

export default function VersionSelector({ versions, selectedVersion, onVersionChange, loading }: VersionSelectorProps) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [filterQuery, setFilterQuery] = useState('');

  const filteredVersions = versions.filter((v) => v.toLowerCase().includes(filterQuery.toLowerCase()));

  if (loading) {
    return (
      <div className='bg-wow-panel border-wow-border-light flex min-w-[160px] items-center gap-2 rounded-sm border px-3 py-2'>
        <svg className='text-wow-gold h-4 w-4 animate-spin' viewBox='0 0 24 24'>
          <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
          <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
        </svg>
        <span className='text-wow-text-dim text-sm'>Loading...</span>
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      className='relative'
      onToggle={() => {
        if (!detailsRef.current?.hasAttribute('open')) {
          setFilterQuery('');
        }
      }}
    >
      <summary className='bg-wow-panel border-wow-border-light hover:border-wow-border-gold flex cursor-pointer list-none items-center gap-2 rounded-sm border px-3 py-2 transition-colors select-none marker:hidden'>
        <svg className='text-wow-gold h-4 w-4 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
          />
        </svg>
        <span className='text-wow-text font-wow-heading max-w-[120px] truncate text-sm tracking-wider'>
          {selectedVersion || 'Select Version'}
        </span>
        <svg className='text-wow-text-muted ml-auto h-3 w-3 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
        </svg>
      </summary>
      <div className='bg-wow-panel border-wow-border-light absolute top-full left-0 z-50 mt-1 max-h-72 w-64 overflow-y-auto rounded-sm border shadow-xl'>
        <div className='p-2'>
          <input
            type='text'
            placeholder='Filter versions...'
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className='bg-wow-bg border-wow-border-light text-wow-text placeholder-wow-text-muted focus:border-wow-border-gold w-full rounded-sm border px-2 py-1.5 text-sm focus:outline-none'
            autoFocus
          />
        </div>
        <div className='border-wow-border-light border-t' />
        <div className='max-h-52 overflow-y-auto py-1'>
          {filteredVersions.map((version) => (
            <button
              key={version}
              onClick={() => {
                onVersionChange(version);
                setFilterQuery('');
                detailsRef.current?.removeAttribute('open');
              }}
              className={`hover:bg-wow-panel-hover w-full px-3 py-1.5 text-left text-sm transition-colors ${
                version === selectedVersion ? 'text-wow-gold bg-wow-border-gold/10' : 'text-wow-text-dim'
              }`}
            >
              {version}
            </button>
          ))}
          {filteredVersions.length === 0 && <p className='text-wow-text-muted px-3 py-2 text-sm'>No versions match</p>}
        </div>
      </div>
    </details>
  );
}
