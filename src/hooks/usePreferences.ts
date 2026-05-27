import { useCallback } from 'react';
import { DEFAULTS } from '../services/preferences';
import type { Preferences } from '../services/preferences';
import { useLocalStorage } from './useLocalStorage';

const STORAGE_KEY = 'wowadder_pref_settings';

export function usePreferences() {
  const [prefs, setPrefs] = useLocalStorage<Preferences>(STORAGE_KEY, DEFAULTS);

  const updatePrefs = useCallback((patch: Partial<Preferences>) => {
    setPrefs((prev) => {
      const next = { ...prev, ...patch };
      return next;
    });
  }, [setPrefs]);

  const reset = useCallback((key: keyof Preferences) => {
    updatePrefs({ [key]: DEFAULTS[key] } as Partial<Preferences>);
  }, [updatePrefs]);

  return { prefs, updatePrefs, reset };
}
