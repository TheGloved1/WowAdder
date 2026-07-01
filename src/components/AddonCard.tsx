import { Clock3, Download, Gamepad2 } from 'lucide-react';
import { isAddonInstalled } from '../services/addonManager';
import { getFileGameVersion } from '../services/curseforge';
import type { CF2Addon } from '../types/curseforge';
import { Badge } from './ui/badge';
import WoWIconFrame from './wow/WoWIcon';

interface AddonCardProps {
  addon: CF2Addon;
  onClick: (id: number) => void;
}

function formatDownloads(num: number): string {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toLocaleString();
}

export default function AddonCard({ addon, onClick }: AddonCardProps) {
  const latestRelease = addon.latestFiles?.find((f) => f.releaseType === 1) ?? addon.latestFiles?.[0];
  const gameVersion = latestRelease ? (getFileGameVersion(latestRelease) ?? '') : '';
  const fileDate = latestRelease?.fileDate ? new Date(latestRelease.fileDate) : null;
  const dateStr = fileDate ? fileDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';
  const installed = isAddonInstalled(addon.id);

  const firstCategory = addon.categories?.[0];
  const extraCategories = Math.max(0, (addon.categories?.length ?? 0) - 1);

  return (
    <button
      onClick={() => onClick(addon.id)}
      className='bg-wow-panel border-wow-border-light hover:border-wow-border-gold/60 group relative min-w-0 rounded-sm border text-left transition-all hover:shadow-[0_0_10px_rgba(161,98,7,0.1)]'
    >
      <div className='flex gap-4 p-4'>
        <WoWIconFrame size='lg'>
          {addon.logo?.thumbnailUrl ?
            <img src={addon.logo.thumbnailUrl} alt={addon.name} className='h-full w-full object-cover' loading='lazy' />
          : <div className='text-wow-text-muted flex h-full w-full items-center justify-center'>
              <svg className='h-8 w-8' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                />
              </svg>
            </div>
          }
        </WoWIconFrame>

        <div className='flex-1'>
          <h3 className='font-wow-heading text-wow-gold group-hover:text-wow-gold/80 truncate text-sm tracking-wide transition-colors'>
            {addon.name}
          </h3>

          {addon.authors?.[0] && (
            <p className='text-wow-text-muted mt-0.5 text-xs'>
              By <span className='text-wow-text-dim'>{addon.authors[0].name}</span>
            </p>
          )}

          <div className='mt-1 flex flex-wrap items-center gap-1.5'>
            {installed && <Badge variant='installed'>Installed</Badge>}
          </div>

          <p className='text-wow-text-dim mt-1.5 line-clamp-2 text-xs leading-relaxed'>{addon.summary}</p>
        </div>
      </div>

      <div className='border-wow-border-light flex items-center gap-3 border-t px-4 py-2 text-xs'>
        {firstCategory && (
          <span className='text-wow-text inline-flex items-center gap-1'>
            <span className='bg-wow-border border-wow-border-light border px-1 py-0.5'>{firstCategory.name}</span>
            {extraCategories > 0 && (
              <span
                className='bg-wow-border border-wow-border-light text-wow-text border px-1 py-0.5'
                title={
                  addon.categories
                    ?.slice(1)
                    .map((c) => c.name)
                    .join(', ') ?? ''
                }
              >
                +{extraCategories}
              </span>
            )}
          </span>
        )}
        <span className='text-wow-text-muted inline-flex items-center gap-1'>
          <Download className='text-wow-text size-4' />
          {formatDownloads(addon.downloadCount)}
        </span>
        {dateStr && (
          <span className='text-wow-text-muted inline-flex items-center gap-1'>
            <Clock3 className='text-wow-text size-4' />
            {dateStr}
          </span>
        )}
        {gameVersion && (
          <span className='text-wow-text-muted inline-flex items-center gap-1'>
            <Gamepad2 className='text-wow-text size-4' />
            {gameVersion}
          </span>
        )}
      </div>
    </button>
  );
}
