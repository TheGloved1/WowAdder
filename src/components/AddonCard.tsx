import { isAddonInstalled } from '../services/addonManager';
import type { CF2Addon } from '../types/curseforge';
import { Badge } from './ui/badge';
import WoWIconFrame from './wow/WoWIcon';

interface AddonCardProps {
  addon: CF2Addon;
  onClick: (id: number) => void;
}

export default function AddonCard({ addon, onClick }: AddonCardProps) {
  const latestRelease = addon.latestFiles?.find((f) => f.releaseType === 1) ?? addon.latestFiles?.[0];

  const gameVersion = latestRelease?.gameVersions?.slice(-1)[0] ?? '';
  const downloadCount = addon.downloadCount.toLocaleString();
  const installed = isAddonInstalled(addon.id);

  const classNames = [
    addon.categories?.find((c) => c.isClass)?.name,
    addon.categories?.find((c) => c.name === 'Healer' || c.name === 'Tank' || c.name === 'Damage Dealer')?.name,
  ].filter(Boolean);

  return (
    <button
      onClick={() => onClick(addon.id)}
      className='bg-wow-panel border-wow-border-light hover:border-wow-border-gold/60 group before:border-wow-border-gold/10 hover:before:border-wow-border-gold/20 relative w-full rounded-sm border p-3.5 text-left transition-all before:pointer-events-none before:absolute before:inset-px before:rounded-sm before:border hover:shadow-[0_0_10px_rgba(161,98,7,0.1)]'
    >
      <div className='relative flex gap-3.5'>
        <WoWIconFrame size='md'>
          {addon.logo?.thumbnailUrl ?
            <img src={addon.logo.thumbnailUrl} alt={addon.name} className='h-full w-full object-cover' loading='lazy' />
          : <div className='text-wow-text-muted flex h-full w-full items-center justify-center'>
              <svg className='h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
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
        <div className='min-w-0 flex-1'>
          <div className='flex items-start justify-between gap-2'>
            <h3 className='font-wow-heading text-wow-gold group-hover:text-wow-gold/80 truncate text-sm tracking-wide transition-colors'>
              {addon.name}
            </h3>
            <span className='text-wow-text-muted shrink-0 text-xs whitespace-nowrap'>{downloadCount} DL</span>
          </div>
          <p className='text-wow-text-dim mt-1 line-clamp-2 text-xs leading-relaxed'>{addon.summary}</p>
          <div className='mt-2 flex flex-wrap items-center gap-1.5'>
            {installed && <Badge variant='installed'>Installed</Badge>}
            {classNames.length > 0 && <Badge variant='class'>{classNames[0]}</Badge>}
            {gameVersion && <Badge variant='info'>{gameVersion}</Badge>}
            {latestRelease?.releaseType === 1 && <Badge variant='release'>Release</Badge>}
            {latestRelease?.releaseType === 2 && <Badge variant='beta'>Beta</Badge>}
            {latestRelease?.releaseType === 3 && <Badge variant='alpha'>Alpha</Badge>}
          </div>
        </div>
      </div>
    </button>
  );
}
