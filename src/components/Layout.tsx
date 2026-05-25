import { check } from '@tauri-apps/plugin-updater';
import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';

export default function Layout() {
  const location = useLocation();
  const [updateState, setUpdateState] = useState<'idle' | 'checking' | 'downloading' | 'installing' | 'error'>('idle');
  const [downloaded, setDownloaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [updateVersion, setUpdateVersion] = useState('');

  useEffect(() => {
    if (import.meta.env.DEV) return;
    let cancelled = false;
    const doUpdate = async () => {
      try {
        setUpdateState('checking');
        const update = await check();
        if (cancelled || !update) {
          if (!cancelled) setUpdateState('idle');
          return;
        }
        setUpdateVersion(update.version);
        setUpdateState('downloading');
        await update.download((event) => {
          if (event.event === 'Started') {
            setTotalSize(event.data.contentLength ?? 0);
          } else if (event.event === 'Progress') {
            setDownloaded((prev) => prev + event.data.chunkLength);
          }
        });
        if (cancelled) return;
        setUpdateState('installing');
        await update.install();
      } catch {
        if (!cancelled) setUpdateState('error');
      }
    };
    doUpdate();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className='text-wow-text flex min-h-screen flex-col'>
      {updateState !== 'idle' && (
        <div
          className={`flex items-center justify-center gap-3 border-b px-4 py-2 text-center text-sm ${
            updateState === 'error' ?
              'bg-wow-danger/15 border-wow-danger/30 text-wow-danger'
            : 'bg-wow-border-gold/10 border-wow-border-gold/30 text-wow-gold'
          }`}
        >
          {updateState === 'checking' && (
            <div className='flex items-center gap-2'>
              <div className='border-wow-gold h-3 w-3 animate-spin rounded-full border-2 border-t-transparent' />
              Checking for updates...
            </div>
          )}
          {updateState === 'downloading' && (
            <div className='flex w-full max-w-sm items-center gap-3'>
              <span className='font-wow-heading shrink-0'>Downloading v{updateVersion}</span>
              <div className='bg-wow-panel border-wow-border-gold/30 relative h-2 flex-1 overflow-hidden rounded-sm border'>
                <div
                  className='from-wow-border-gold to-wow-gold absolute inset-0 bg-linear-to-r transition-all duration-200'
                  style={{
                    width: totalSize > 0 ? `${Math.min(100, (downloaded / totalSize) * 100)}%` : '0%',
                  }}
                />
              </div>
              <span className='text-wow-text-dim w-12 shrink-0 text-right text-xs'>
                {totalSize > 0 ?
                  `${Math.min(99, Math.round((downloaded / totalSize) * 100))}%`
                : `${(downloaded / 1024 / 1024).toFixed(1)} MB`}
              </span>
            </div>
          )}
          {updateState === 'installing' && (
            <div className='flex items-center gap-2'>
              <div className='border-wow-gold h-3 w-3 animate-spin rounded-full border-2 border-t-transparent' />
              <span className='font-wow-heading'>Installing v{updateVersion}...</span>
            </div>
          )}
          {updateState === 'error' && 'Update check failed'}
        </div>
      )}
      <header className='border-wow-border relative border-b'>
        <div className='from-wow-border-gold/5 pointer-events-none absolute inset-0 bg-linear-to-b to-transparent' />
        <div className='relative mx-auto flex h-14 max-w-7xl items-center justify-between px-4'>
          <div className='group flex items-center gap-3 transition-opacity hover:opacity-80'>
            <div className='from-wow-gold via-wow-gold-dim to-wow-border-gold/60 flex h-8 w-8 items-center justify-center rounded-sm bg-linear-to-br shadow-[0_0_8px_rgba(251,191,36,0.2)]'>
              <img src='/logo.png' alt='WowAdder' className='h-8 w-8' />
            </div>
            <span className='font-wow-heading text-wow-gold group-hover:text-wow-gold/80 text-lg tracking-wider transition-colors'>
              WowAdder
            </span>
          </div>
          <nav className='flex items-center gap-1'>
            <Link
              to='/'
              className={`font-wow-heading relative px-3 py-1.5 text-sm tracking-wider uppercase transition-all duration-150 ${
                location.pathname === '/' ?
                  'text-wow-gold after:bg-wow-gold/60 after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-3/4 after:-translate-x-1/2'
                : 'text-wow-text-dim hover:text-wow-text'
              }`}
            >
              Browse
            </Link>
            <Link
              to='/installed'
              className={`font-wow-heading relative px-3 py-1.5 text-sm tracking-wider uppercase transition-all duration-150 ${
                location.pathname === '/installed' ?
                  'text-wow-gold after:bg-wow-gold/60 after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-3/4 after:-translate-x-1/2'
                : 'text-wow-text-dim hover:text-wow-text'
              }`}
            >
              Installed
            </Link>
            <div className='bg-wow-border-light mx-1 h-4 w-px' />
            <Link
              to='/settings'
              className={`font-wow-heading relative px-3 py-1.5 text-sm tracking-wider uppercase transition-all duration-150 ${
                location.pathname === '/settings' ?
                  'text-wow-gold after:bg-wow-gold/60 after:absolute after:bottom-0 after:left-1/2 after:h-px after:w-3/4 after:-translate-x-1/2'
                : 'text-wow-text-dim hover:text-wow-text'
              }`}
            >
              Settings
            </Link>
          </nav>
        </div>
      </header>
      <main className='flex-1'>
        <Outlet />
      </main>
    </div>
  );
}
