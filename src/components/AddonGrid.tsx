import { Skeleton } from '@/components/ui/skeleton';
import type { CF2Addon } from '../types/curseforge';
import AddonCard from './AddonCard';

interface AddonGridProps {
  addons: CF2Addon[];
  onAddonClick: (id: number) => void;
  loading?: boolean;
  error?: string | null;
}

export default function AddonGrid({ addons, onAddonClick, loading, error }: AddonGridProps) {
  if (error) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-center'>
          <div className='border-wow-danger/40 bg-wow-danger/10 mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border'>
            <svg className='text-wow-danger h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
              />
            </svg>
          </div>
          <p className='text-wow-danger font-wow-heading text-sm tracking-wider'>Failed to load addons</p>
          <p className='text-wow-text-muted mt-1 text-xs'>{error}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className='grid gap-3'>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className='border-wow-border-light rounded-sm border p-3.5'>
            <div className='flex gap-3.5'>
              <Skeleton className='h-16 w-16' />
              <div className='flex-1 space-y-2'>
                <Skeleton className='h-4 w-2/3' />
                <Skeleton className='h-3 w-full' />
                <Skeleton className='h-3 w-1/2' />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (addons.length === 0) {
    return (
      <div className='flex items-center justify-center py-20'>
        <div className='text-center'>
          <div className='border-wow-border-light bg-wow-panel mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border'>
            <svg className='text-wow-text-muted h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'
              />
            </svg>
          </div>
          <p className='text-wow-text-dim font-wow-heading text-sm tracking-wider'>No addons found</p>
          <p className='text-wow-text-muted mt-1 text-xs'>Try a different search or filter</p>
        </div>
      </div>
    );
  }

  return (
    <div className='grid gap-3'>
      {addons.map((addon) => (
        <AddonCard key={addon.id} addon={addon} onClick={onAddonClick} />
      ))}
    </div>
  );
}
