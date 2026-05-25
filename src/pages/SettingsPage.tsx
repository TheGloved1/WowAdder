import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { version } from '../../package.json';
import changelogRaw from '../../CHANGELOG.md?raw';
import WoWDivider from '../components/wow/WoWDivider';
import WoWPanel from '../components/wow/WoWPanel';
import type { ColorScheme } from '../services/preferences';
import { loadPrefs, savePrefs } from '../services/preferences';

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

export default function SettingsPage() {
  const prefs = loadPrefs();
  const [colorScheme, setColorScheme] = useState<ColorScheme>(prefs.colorScheme);
  const [changelogOpen, setChangelogOpen] = useState(false);

  function handleSchemeChange(scheme: ColorScheme) {
    setColorScheme(scheme);
    document.documentElement.setAttribute('data-theme', scheme);
    savePrefs({ colorScheme: scheme });
  }

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <h1 className='font-wow-heading text-wow-gold mb-6 text-2xl tracking-wider'>Settings</h1>

      <WoWPanel className='p-6'>
        <h2 className='font-wow-heading text-wow-gold mb-1 text-lg tracking-wider'>Color Scheme</h2>
        <p className='text-wow-text-dim mb-4 text-sm'>Choose the look and feel of WowAdder.</p>

        <div className='grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5'>
          {SCHEMES.map((scheme) => {
            const active = colorScheme === scheme.id;
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

        <WoWDivider className='my-6' />

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
        </div>

        <div className='mt-6'>
          <button
            onClick={() => setChangelogOpen(!changelogOpen)}
            className='text-wow-gold-dim hover:text-wow-gold flex w-full items-center gap-2 text-left text-sm tracking-wider transition-colors'
          >
            <span className={`inline-block transition-transform duration-200 ${changelogOpen ? 'rotate-90' : ''}`}>&#8250;</span>
            Changelog
          </button>
          {changelogOpen && (
            <div className='bg-wow-bg border-wow-border mt-2 max-h-96 overflow-y-auto rounded-sm border p-4'>
              <ReactMarkdown
                components={{
                  h1: ({ children }) => <h1 className='font-wow-heading text-wow-gold mb-2 text-base tracking-wider'>{children}</h1>,
                  h2: ({ children }) => <h2 className='font-wow-heading text-wow-gold-dim mb-2 mt-4 text-sm tracking-wider first:mt-0'>{children}</h2>,
                  h3: ({ children }) => <h3 className='text-wow-text-dim mb-1 mt-3 text-xs font-semibold tracking-wider'>{children}</h3>,
                  p: ({ children }) => <p className='text-wow-text-dim mb-1 text-xs'>{children}</p>,
                  ul: ({ children }) => <ul className='text-wow-text-dim mb-2 ml-3 list-inside list-disc text-xs'>{children}</ul>,
                  li: ({ children }) => <li className='mb-0.5'>{children}</li>,
                  strong: ({ children }) => <strong className='text-wow-text'>{children}</strong>,
                }}
              >
                {changelogRaw}
              </ReactMarkdown>
            </div>
          )}
        </div>
      </WoWPanel>
    </div>
  );
}
