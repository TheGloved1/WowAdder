import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useUpdate } from './UpdateProvider';

export default function Layout() {
  const location = useLocation();
  const { updateState, updateVersion, updateBody, downloaded, totalSize, installUpdate, dismissUpdate } = useUpdate();
  const [changelogOpen, setChangelogOpen] = useState(false);

  return (
    <div className='text-wow-text flex min-h-screen flex-col'>
      {updateState === 'available' && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) dismissUpdate();
          }}
        >
          <DialogContent className='max-w-lg'>
            <DialogHeader>
              <DialogTitle>Update Available</DialogTitle>
              <DialogDescription>
                Version <span className='text-wow-gold'>{updateVersion}</span> is available for download.
              </DialogDescription>
            </DialogHeader>

            <Collapsible open={changelogOpen} onOpenChange={setChangelogOpen} className='mt-3'>
              <CollapsibleTrigger className='text-xs'>
                <span>Changelog</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${changelogOpen ? 'rotate-180' : ''}`}
                />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className='bg-wow-bg border-wow-border mt-2 max-h-48 overflow-y-auto rounded-sm border p-3'>
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => (
                        <h1 className='font-wow-heading text-wow-gold mb-1 text-sm tracking-wider'>{children}</h1>
                      ),
                      h2: ({ children }) => (
                        <h2 className='font-wow-heading text-wow-gold-dim mt-3 mb-1 text-xs tracking-wider first:mt-0'>
                          {children}
                        </h2>
                      ),
                      h3: ({ children }) => (
                        <h3 className='text-wow-text-dim mt-2 mb-1 text-[11px] font-semibold tracking-wider'>{children}</h3>
                      ),
                      p: ({ children }) => <p className='text-wow-text-dim mb-1 text-[11px]'>{children}</p>,
                      ul: ({ children }) => (
                        <ul className='text-wow-text-dim mb-2 ml-3 list-inside list-disc text-[11px]'>{children}</ul>
                      ),
                      li: ({ children }) => <li className='mb-0.5'>{children}</li>,
                      strong: ({ children }) => <strong className='text-wow-text'>{children}</strong>,
                    }}
                  >
                    {updateBody}
                  </ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>

            <div className='mt-5 flex justify-end gap-3'>
              <Button variant='ghost' onClick={dismissUpdate}>
                Not Now
              </Button>
              <Button
                variant='primary'
                onClick={() => {
                  dismissUpdate();
                  setTimeout(installUpdate, 100);
                }}
              >
                Install Update
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {(updateState === 'checking' ||
        updateState === 'downloading' ||
        updateState === 'installing' ||
        updateState === 'error') && (
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
              <Progress value={totalSize > 0 ? Math.min(100, (downloaded / totalSize) * 100) : 0} className='flex-1' />
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
