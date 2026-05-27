import { useCallback, useEffect, useState } from 'react';
import { DEFAULTS, loadPrefs, savePrefs } from '../services/preferences';
import type { Preferences } from '../services/preferences';

const PREFIX = 'wowadder_pref_';

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => loadPrefs());

  const updatePrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      savePrefs(patch);
      return next;
    });
  }, []);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === `${PREFIX}settings`) {
        setPrefs(loadPrefs());
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const reset = useCallback((key: keyof Preferences) => {
    updatePrefs({ [key]: DEFAULTS[key] } as Partial<Preferences>);
  }, [updatePrefs]);

  return { prefs, updatePrefs, reset };
}
