import type { SortOption } from "../components/SortSelector";

const PREFIX = "wowadder_pref_";

interface Preferences {
  version: string;
  pageSize: number;
  sortOption: SortOption;
}

const DEFAULTS: Preferences = {
  version: "",
  pageSize: 20,
  sortOption: { label: "Most Downloads", field: 6, order: "desc" },
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