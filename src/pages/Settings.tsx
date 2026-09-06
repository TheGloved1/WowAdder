import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { WoWSeparator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { open } from '@tauri-apps/plugin-dialog';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import changelogRaw from '../../CHANGELOG.md?raw';
import privacyRaw from '../../PRIVACY.md?raw';
import termsRaw from '../../TERMS.md?raw';
import { version } from '../../package.json';
import { useUpdate } from '../components/UpdateProvider';
import { usePreferences } from '../hooks/usePreferences';
import { addWatchFolder, getDefaultDownloadsFolder, removeWatchFolder } from '../services/addonManager';
import type { ColorScheme, HeadingFont } from '../services/preferences';
import { HEADING_FONTS } from '../services/preferences';

interface SchemeOption {
  id: ColorScheme;
  label: string;
  desc: string;
  colors: { bg: string; accent: string; text: string };
}

const SCHEMES: SchemeOption[] = [
  {
    id: 'default',
    label: 'Default Gold',
    desc: 'The classic WoW gold-on-dark theme',
    colors: { bg: '#0c0a09', accent: '#fbbf24', text: '#faf6f0' },
  },
  {
    id: 'emerald',
    label: 'Midnight Emerald',
    desc: 'Deep forest greens and emerald accents',
    colors: { bg: '#0a0f0b', accent: '#34d973', text: '#ecfdf0' },
  },
  {
    id: 'crimson',
    label: 'Blood Elf Crimson',
    desc: "Rich reds fit for the Sin'dorei",
    colors: { bg: '#0f0808', accent: '#fb7185', text: '#fef2f2' },
  },
  {
    id: 'nightelf',
    label: 'Night Elf Purple',
    desc: 'Arcane purples and violet hues',
    colors: { bg: '#0b0910', accent: '#a78bfa', text: '#f3e8ff' },
  },
  {
    id: 'frost',
    label: 'Frosty Blue',
    desc: 'Icy blues from the Frozen Throne',
    colors: { bg: '#070b0f', accent: '#38bdf8', text: '#f0f9ff' },
  },
];

export default function Settings() {
  const { prefs, updatePrefs } = usePreferences();
  const { updateState, updateVersion, downloaded, totalSize, checkForUpdates, installUpdate } = useUpdate();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [watchFolders, setWatchFolders] = useState<string[]>(prefs.downloadWatchFolders);

  function handleFontChange(font: HeadingFont) {
    document.documentElement.style.setProperty('--font-wow-heading', `'${font}', serif`);
    updatePrefs({ headingFont: font });
  }

  function handleSchemeChange(scheme: ColorScheme) {
    document.documentElement.setAttribute('data-theme', scheme);
    updatePrefs({ colorScheme: scheme });
  }

  async function handleBrowserInstallToggle(checked: boolean) {
    updatePrefs({ browserInstall: checked });
    if (checked && watchFolders.length === 0) {
      const defaultPath = await getDefaultDownloadsFolder();
      if (defaultPath) {
        setWatchFolders([defaultPath]);
        addWatchFolder(defaultPath);
      }
    }
  }

  function handleDeleteZipToggle(checked: boolean) {
    updatePrefs({ deleteZipAfterInstall: checked });
  }

  function handleDeepLinkToggle(checked: boolean) {
    updatePrefs({ deepLink: checked });
  }

  async function handleAddWatchFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select a download folder to watch',
    });
    if (selected && typeof selected === 'string' && !watchFolders.includes(selected)) {
      const next = [...watchFolders, selected];
      setWatchFolders(next);
      addWatchFolder(selected);
    }
  }

  function handleRemoveWatchFolder(path: string) {
    const next = watchFolders.filter((f) => f !== path);
    setWatchFolders(next);
    removeWatchFolder(path);
  }

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <h1 className='font-wow-heading text-wow-gold mb-6 text-2xl tracking-wider'>Settings</h1>

      <Card className='p-6'>
        <h2 className='font-wow-heading text-wow-gold mb-1 text-lg tracking-wider'>Color Scheme</h2>
        <p className='text-wow-text-dim mb-4 text-sm'>Choose the look and feel of WowAdder.</p>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5'>
          {SCHEMES.map((scheme) => {
            const active = prefs.colorScheme === scheme.id;
            return (
              <button
                key={scheme.id}
                onClick={() => handleSchemeChange(scheme.id)}
                className={`group rounded-sm border p-3 text-left transition-all duration-150 ${
                  active ?
                    'border-wow-gold bg-wow-panel-hover shadow-[0_0_10px_rgba(251,191,36,0.1)]'
                  : 'border-wow-border-light bg-wow-panel hover:border-wow-border-gold/50 hover:bg-wow-panel-hover'
                }`}
              >
                <div className='border-wow-border-light mb-2 flex h-12 overflow-hidden rounded-sm border'>
                  <div className='flex-1' style={{ backgroundColor: scheme.colors.bg }} />
                  <div className='w-1/3' style={{ backgroundColor: scheme.colors.accent }} />
                </div>
                <div className='flex items-center gap-2'>
                  <div
                    className='border-wow-border h-3 w-3 rounded-full border'
                    style={{ backgroundColor: scheme.colors.accent }}
                  />
                  <span
                    className={`font-wow-heading text-xs tracking-wider ${active ? 'text-wow-gold' : 'text-wow-text-dim'}`}
                  >
                    {scheme.label}
                  </span>
                </div>
                <p className='text-wow-text-muted mt-1 text-[11px] leading-tight'>{scheme.desc}</p>
              </button>
            );
          })}
        </div>

        <div className='mt-6'>
          <h2 className='font-wow-heading text-wow-gold mb-1 text-lg tracking-wider'>Heading Font</h2>
          <p className='text-wow-text-dim mb-4 text-sm'>Choose the font for titles and headings.</p>

          <Select value={prefs.headingFont} onValueChange={(v) => handleFontChange(v as HeadingFont)}>
            <SelectTrigger className='w-64'>
              <SelectValue>
                <span style={{ fontFamily: `'${prefs.headingFont}', serif` }}>{HEADING_FONTS[prefs.headingFont]}</span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.entries(HEADING_FONTS) as [HeadingFont, string][]).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  <span style={{ fontFamily: `'${value}', serif` }}>{label}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <WoWSeparator className='my-6' />

        <h2 className='font-wow-heading text-wow-gold mb-1 text-lg tracking-wider'>Browser Install</h2>
        <p className='text-wow-text-dim mb-4 text-sm leading-relaxed'>
          When enabled, clicking Install opens the CurseForge download page for that version in your browser. After you
          download the file through CurseForge, WowAdder detects the ZIP in your watched folders and installs it
          automatically. This supports addon authors through CurseForge's ad impressions and download tracking.
        </p>
        <label className='flex cursor-pointer items-center gap-3'>
          <Switch checked={prefs.browserInstall} onCheckedChange={handleBrowserInstallToggle} />
          <span
            className={`font-wow-heading text-sm tracking-wider ${prefs.browserInstall ? 'text-wow-gold' : 'text-wow-text-dim'}`}
          >
            {prefs.browserInstall ? 'Using Browser Install' : 'Using Fast Install'}
          </span>
        </label>

        {prefs.browserInstall && (
          <>
            <div className='mt-4'>
              <p className='text-wow-text-dim mb-2 text-xs'>Watched download folders:</p>
              <div className='max-h-40 space-y-1 overflow-y-auto'>
                {watchFolders.length === 0 ?
                  <p className='text-wow-text-muted text-xs italic'>No folders added yet. Add one or more below.</p>
                : watchFolders.map((f) => (
                    <div
                      key={f}
                      className='bg-wow-bg border-wow-border-light flex items-center justify-between rounded-sm border px-2 py-1.5'
                    >
                      <span className='text-wow-text-dim truncate text-xs'>{f}</span>
                      <button
                        onClick={() => handleRemoveWatchFolder(f)}
                        className='text-wow-text-muted hover:text-wow-danger ml-2 shrink-0'
                      >
                        <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                        </svg>
                      </button>
                    </div>
                  ))
                }
              </div>
              <button
                onClick={handleAddWatchFolder}
                className='text-wow-gold-dim hover:text-wow-gold mt-2 flex items-center gap-1 text-xs tracking-wide transition-colors'
              >
                <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                </svg>
                Add folder
              </button>
            </div>

            <label className='mt-4 flex cursor-pointer items-center gap-3'>
              <Switch checked={prefs.deleteZipAfterInstall} onCheckedChange={handleDeleteZipToggle} />
              <span
                className={`font-wow-heading text-sm tracking-wider ${prefs.deleteZipAfterInstall ? 'text-wow-gold' : 'text-wow-text-dim'}`}
              >
                {prefs.deleteZipAfterInstall ? 'Deleting ZIP after install' : 'Keeping ZIP after install'}
              </span>
            </label>
          </>
        )}

        <WoWSeparator className='my-6' />

        <h2 className='font-wow-heading text-wow-gold mb-1 text-lg tracking-wider'>Make WowAdder Default</h2>
        <p className='text-wow-text-dim mb-4 text-sm leading-relaxed'>
          When enabled, WowAdder will intercept{' '}
          <code className='text-wow-gold bg-wow-bg rounded-sm px-1'>curseforge://</code> protocol links from your browser.
          This allows the &ldquo;Install with CurseForge App&rdquo; buttons on addon pages to install directly into WowAdder
          instead of the official CurseForge client.
        </p>
        <label className='flex cursor-pointer items-center gap-3'>
          <Switch checked={prefs.deepLink} onCheckedChange={handleDeepLinkToggle} />
          <span
            className={`font-wow-heading text-sm tracking-wider ${prefs.deepLink ? 'text-wow-gold' : 'text-wow-text-dim'}`}
          >
            {prefs.deepLink ? 'Handling CurseForge install links' : 'Not handling CurseForge install links'}
          </span>
        </label>

        <WoWSeparator className='my-6' />

        <h2 className='font-wow-heading text-wow-gold mb-1 text-lg tracking-wider'>About WowAdder</h2>
        <p className='text-wow-text-dim text-sm leading-relaxed'>
          A desktop addon manager for World of Warcraft. Browse, install, and manage addons from CurseForge directly from
          your desktop.
        </p>

        <div className='text-wow-text-muted mt-4 flex items-center gap-4 text-xs'>
          <span>v{version}</span>
          <span className='bg-wow-border-light h-3 w-px' />
          <span>
            Data provided by{' '}
            <a
              href='https://www.curseforge.com/wow/addons'
              target='_blank'
              rel='noopener noreferrer'
              className='text-wow-gold hover:underline'
            >
              CurseForge
            </a>
          </span>
          <span className='bg-wow-border-light h-3 w-px' />
          <a
            href='https://github.com/TheGloved1/WowAdder'
            target='_blank'
            rel='noopener noreferrer'
            className='text-wow-gold hover:underline'
          >
            GitHub
          </a>
        </div>

        <div className='mt-4 flex items-center gap-3'>
          {updateState === 'idle' && (
            <button
              onClick={checkForUpdates}
              className='font-wow-heading text-wow-text-dim hover:text-wow-gold text-xs tracking-wider transition-colors'
            >
              Check for Updates
            </button>
          )}
          {updateState === 'checking' && (
            <div className='flex items-center gap-2'>
              <div className='border-wow-gold h-3 w-3 animate-spin rounded-full border-2 border-t-transparent' />
              <span className='text-wow-text-dim text-xs'>Checking for updates...</span>
            </div>
          )}
          {updateState === 'available' && (
            <div className='flex items-center gap-2'>
              <button
                onClick={installUpdate}
                className='font-wow-heading text-wow-gold hover:text-wow-gold/80 text-xs tracking-wider transition-colors'
              >
                Update to {updateVersion}
              </button>
            </div>
          )}
          {updateState === 'downloading' && (
            <div className='flex w-full max-w-xs items-center gap-2'>
              <span className='text-wow-text-dim shrink-0 text-xs'>Downloading v{updateVersion}</span>
              <Progress value={totalSize > 0 ? Math.min(100, (downloaded / totalSize) * 100) : 0} className='h-1.5 flex-1' />
              <span className='text-wow-text-muted shrink-0 text-xs'>
                {totalSize > 0 ? `${Math.round((downloaded / totalSize) * 100)}%` : '...'}
              </span>
            </div>
          )}
          {updateState === 'installing' && (
            <div className='flex items-center gap-2'>
              <div className='border-wow-gold h-3 w-3 animate-spin rounded-full border-2 border-t-transparent' />
              <span className='text-wow-text-dim text-xs'>Installing v{updateVersion}...</span>
            </div>
          )}
          {updateState === 'error' && (
            <button
              onClick={checkForUpdates}
              className='font-wow-heading text-wow-danger hover:text-wow-danger/80 text-xs tracking-wider transition-colors'
            >
              Check failed — Retry
            </button>
          )}
        </div>

        <div className='mt-6'>
          <button
            onClick={() => setChangelogOpen(!changelogOpen)}
            className='text-wow-gold-dim hover:text-wow-gold flex w-full items-center gap-2 text-left text-sm tracking-wider transition-colors'
          >
            <span className={`inline-block transition-transform duration-200 ${changelogOpen ? 'rotate-90' : ''}`}>
              &#8250;
            </span>
            Changelog
          </button>
          {changelogOpen && (
            <div className='bg-wow-bg border-wow-border mt-2 max-h-96 overflow-y-auto rounded-sm border p-4'>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className='font-wow-heading text-wow-gold mb-2 text-base tracking-wider'>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className='font-wow-heading text-wow-gold-dim mt-4 mb-2 text-sm tracking-wider first:mt-0'>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className='text-wow-text-dim mt-3 mb-1 text-xs font-semibold tracking-wider'>{children}</h3>
                  ),
                  p: ({ children }) => <p className='text-wow-text-dim mb-1 text-xs'>{children}</p>,
                  ul: ({ children }) => (
                    <ul className='text-wow-text-dim mb-2 ml-3 list-inside list-disc text-xs'>{children}</ul>
                  ),
                  li: ({ children }) => <li className='mb-0.5'>{children}</li>,
                  strong: ({ children }) => <strong className='text-wow-text'>{children}</strong>,
                }}
              >
                {changelogRaw}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className='mt-4'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => setPrivacyOpen(!privacyOpen)}
              className='text-wow-gold-dim hover:text-wow-gold flex items-center gap-2 text-left text-sm tracking-wider transition-colors'
            >
              <span className={`inline-block transition-transform duration-200 ${privacyOpen ? 'rotate-90' : ''}`}>
                &#8250;
              </span>
              Privacy Policy
            </button>
            <a
              href='https://github.com/TheGloved1/WowAdder/blob/main/PRIVACY.md'
              target='_blank'
              rel='noopener noreferrer'
              className='text-wow-text-muted hover:text-wow-gold text-xs tracking-wider transition-colors'
            >
              Open on GitHub &rarr;
            </a>
          </div>
          {privacyOpen && (
            <div className='bg-wow-bg border-wow-border mt-2 max-h-96 overflow-y-auto rounded-sm border p-4'>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className='font-wow-heading text-wow-gold mb-2 text-base tracking-wider'>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className='font-wow-heading text-wow-gold-dim mt-4 mb-2 text-sm tracking-wider first:mt-0'>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className='text-wow-text-dim mt-3 mb-1 text-xs font-semibold tracking-wider'>{children}</h3>
                  ),
                  p: ({ children }) => <p className='text-wow-text-dim mb-1 text-xs'>{children}</p>,
                  ul: ({ children }) => (
                    <ul className='text-wow-text-dim mb-2 ml-3 list-inside list-disc text-xs'>{children}</ul>
                  ),
                  li: ({ children }) => <li className='mb-0.5'>{children}</li>,
                  strong: ({ children }) => <strong className='text-wow-text'>{children}</strong>,
                }}
              >
                {privacyRaw}
              </ReactMarkdown>
            </div>
          )}
        </div>

        <div className='mt-4'>
          <div className='flex items-center justify-between'>
            <button
              onClick={() => setTermsOpen(!termsOpen)}
              className='text-wow-gold-dim hover:text-wow-gold flex items-center gap-2 text-left text-sm tracking-wider transition-colors'
            >
              <span className={`inline-block transition-transform duration-200 ${termsOpen ? 'rotate-90' : ''}`}>
                &#8250;
              </span>
              Terms of Service
            </button>
            <a
              href='https://github.com/TheGloved1/WowAdder/blob/main/TERMS.md'
              target='_blank'
              rel='noopener noreferrer'
              className='text-wow-text-muted hover:text-wow-gold text-xs tracking-wider transition-colors'
            >
              Open on GitHub &rarr;
            </a>
          </div>
          {termsOpen && (
            <div className='bg-wow-bg border-wow-border mt-2 max-h-96 overflow-y-auto rounded-sm border p-4'>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className='font-wow-heading text-wow-gold mb-2 text-base tracking-wider'>{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className='font-wow-heading text-wow-gold-dim mt-4 mb-2 text-sm tracking-wider first:mt-0'>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className='text-wow-text-dim mt-3 mb-1 text-xs font-semibold tracking-wider'>{children}</h3>
                  ),
                  p: ({ children }) => <p className='text-wow-text-dim mb-1 text-xs'>{children}</p>,
                  ul: ({ children }) => (
                    <ul className='text-wow-text-dim mb-2 ml-3 list-inside list-disc text-xs'>{children}</ul>
                  ),
                  li: ({ children }) => <li className='mb-0.5'>{children}</li>,
                  strong: ({ children }) => <strong className='text-wow-text'>{children}</strong>,
                }}
              >
                {termsRaw}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
