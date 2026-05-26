import type { SortOption } from '../components/SortSelector';

export type ColorScheme = 'default' | 'emerald' | 'crimson' | 'nightelf' | 'frost';

const PREFIX = 'wowadder_pref_';

interface Preferences {
  versions: string[];
  pageSize: number;
  sortOption: SortOption;
  colorScheme: ColorScheme;
  supportDevs: boolean;
  downloadWatchFolders: string[];
  deleteZipAfterInstall: boolean;
}

const DEFAULTS: Preferences = {
  versions: [],
  pageSize: 20,
  sortOption: { label: 'Most Downloads', field: 6, order: 'desc' },
  colorScheme: 'default',
  supportDevs: true,
  downloadWatchFolders: [],
  deleteZipAfterInstall: true,
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
