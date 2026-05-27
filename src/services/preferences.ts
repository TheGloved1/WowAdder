import type { SortOption } from '../components/SortSelector';

export type ColorScheme = 'default' | 'emerald' | 'crimson' | 'nightelf' | 'frost';

export const HEADING_FONTS = {
  Cinzel: 'Cinzel',
  'Cinzel Decorative': 'Cinzel Alt',
  'Macondo Swash Caps': 'Macondo',
  MedievalSharp: 'Medieval',
  'Uncial Antiqua': 'Antiqua',
  Caudex: 'Caudex',
  Almendra: 'Almenda',
  'IM Fell English': 'IM Fell',
  Metamorphous: 'Metamorphous',
  'Pirata One': 'Pirata One',
  Fondamento: 'Fondamento',
  'Eagle Lake': 'Eagle Lake',
  'Germania One': 'Germania',
  Oldenburg: 'Oldenburg',
  'Trade Winds': 'Trade Winds',
  Rye: 'Rye',
  Romanesco: 'Romanesco',
  Felipa: 'Felipa',
  Quintessential: 'Quintessential',
  Tangerine: 'Tangerine',
} as const;
export type HeadingFont = keyof typeof HEADING_FONTS;
const PREFIX = 'wowadder_pref_';

export type Preferences = {
  versions: string[];
  pageSize: number;
  sortOption: SortOption;
  colorScheme: ColorScheme;
  headingFont: HeadingFont;
  supportDevs: boolean;
  downloadWatchFolders: string[];
  deleteZipAfterInstall: boolean;
  deepLink: boolean;
  searchQuery: string;
};

export const DEFAULTS: Preferences = {
  versions: [],
  pageSize: 20,
  sortOption: { label: 'Most Downloads', field: 6, order: 'desc' },
  colorScheme: 'default',
  headingFont: 'Caudex',
  supportDevs: true,
  downloadWatchFolders: [],
  deleteZipAfterInstall: true,
  deepLink: false,
  searchQuery: '',
};

export function loadPrefs(): Preferences {
  try {
    const raw = localStorage.getItem(`${PREFIX}settings`);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULTS, ...parsed };
    }
  } catch {}
  return { ...DEFAULTS };
}

export function savePrefs(prefs: Partial<Preferences>) {
  const current = loadPrefs();
  const merged = { ...current, ...prefs };
  localStorage.setItem(`${PREFIX}settings`, JSON.stringify(merged));
}
