import { check, type Update } from '@tauri-apps/plugin-updater';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

type UpdateState = 'idle' | 'checking' | 'available' | 'downloading' | 'installing' | 'error';

interface UpdateContextValue {
  updateState: UpdateState;
  updateVersion: string;
  updateBody: string;
  downloaded: number;
  totalSize: number;
  checkForUpdates: () => Promise<void>;
  installUpdate: () => Promise<void>;
  dismissUpdate: () => void;
}

const UpdateContext = createContext<UpdateContextValue>({
  updateState: 'idle',
  updateVersion: '',
  updateBody: '',
  downloaded: 0,
  totalSize: 0,
  checkForUpdates: async () => {},
  installUpdate: async () => {},
  dismissUpdate: () => {},
});

export function useUpdate() {
  return useContext(UpdateContext);
}

export function UpdateProvider({ children }: { children: React.ReactNode }) {
  const updateRef = useRef<Update | null>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [updateState, setUpdateState] = useState<UpdateState>('idle');
  const [updateVersion, setUpdateVersion] = useState('');
  const [updateBody, setUpdateBody] = useState('');
  const [downloaded, setDownloaded] = useState(0);
  const [totalSize, setTotalSize] = useState(0);

  const checkForUpdates = useCallback(async () => {
    clearTimeout(errorTimerRef.current);
    setUpdateState('checking');
    try {
      const update = await check();
      if (!update) {
        setUpdateState('idle');
        return;
      }
      updateRef.current = update;
      setUpdateVersion(update.version);
      setUpdateBody(typeof update.body === 'string' ? update.body : '');
      setUpdateState('available');
    } catch {
      setUpdateState('error');
      errorTimerRef.current = setTimeout(() => setUpdateState('idle'), 5000);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    const update = updateRef.current;
    if (!update) return;
    clearTimeout(errorTimerRef.current);
    setUpdateState('downloading');
    setDownloaded(0);
    setTotalSize(0);
    try {
      await update.download((event) => {
        if (event.event === 'Started') {
          setTotalSize(event.data.contentLength ?? 0);
        } else if (event.event === 'Progress') {
          setDownloaded((prev) => prev + event.data.chunkLength);
        }
      });
      setUpdateState('installing');
      await update.install();
    } catch {
      setUpdateState('error');
      errorTimerRef.current = setTimeout(() => setUpdateState('idle'), 5000);
    }
  }, []);

  const dismissUpdate = useCallback(() => {
    updateRef.current?.close();
    updateRef.current = null;
    setUpdateState('idle');
  }, []);

  useEffect(() => {
    if (import.meta.env.DEV) return;
    checkForUpdates();
  }, [checkForUpdates]);

  return (
    <UpdateContext.Provider
      value={{
        updateState,
        updateVersion,
        updateBody,
        downloaded,
        totalSize,
        checkForUpdates,
        installUpdate,
        dismissUpdate,
      }}
    >
      {children}
    </UpdateContext.Provider>
  );
}
