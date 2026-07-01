import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAddonUpdateChecker } from '../hooks/useCurseforge';
import { usePreferences } from '../hooks/usePreferences';
import type { InstalledAddon, ScannedAddon } from '../services/addonManager';
import {
  adoptAllScannedAddons,
  adoptScannedAddon,
  getAddonsFolder,
  getInstalledAddons,
  importZip,
  loadDb,
  matchAllScannedAddons,
  matchScannedAddon,
  pickAddonsFolder,
  scanAddonsFolder,
  uninstallAddon,
  updateAddon,
} from '../services/addonManager';
import { getFileGameVersion } from '../services/curseforge';
import type { UpdateInfo } from '../types/curseforge';
import type { InstallProgressPayload } from '../types/progress';

export default function Installed() {
  const navigate = useNavigate();
  const [addonsFolder, setAddonsFolderState] = useState<string | null>(null);
  const [installed, setInstalled] = useState<InstalledAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState<ScannedAddon[]>([]);
  const [scanning, setScanning] = useState(false);
  const [uninstalling, setUninstalling] = useState<number | null>(null);
  const [matching, setMatching] = useState<Set<string>>(new Set());
  const [batchMatching, setBatchMatching] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);
  const [batchAdopting, setBatchAdopting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importLabel, setImportLabel] = useState('');
  const [batchProgress, setBatchProgress] = useState<string | null>(null);
  const [updateResults, setUpdateResults] = useState<Record<number, UpdateInfo>>({});
  const [checkingUpdates, setCheckingUpdates] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ addon: InstalledAddon; info: UpdateInfo } | null>(null);
  const [installingUpdates, setInstallingUpdates] = useState<
    Record<number, { progress: number; label: string; error?: string }>
  >({});

  const { checkAll } = useAddonUpdateChecker();
  const { prefs } = usePreferences();
  const gameVersion = prefs.versions[0];

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    const folder = await getAddonsFolder();
    setAddonsFolderState(folder);
    if (folder) {
      await loadDb();
      setInstalled(getInstalledAddons());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!importing) return;
    const unlisten = listen<InstallProgressPayload>('install-progress', (event) => {
      setImportProgress(event.payload.progress);
      setImportLabel(event.payload.label);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [importing]);

  async function handlePickFolder() {
    const path = await pickAddonsFolder();
    if (path) {
      await refresh();
    }
  }

  async function handleUninstall(modId: number) {
    setUninstalling(modId);
    try {
      await uninstallAddon(modId);
      await refresh();
    } finally {
      setUninstalling(null);
    }
  }

  async function handleScan() {
    setScanning(true);
    setScanned([]);
    setBatchProgress(null);
    try {
      const results = await scanAddonsFolder();
      setScanned(results);
    } finally {
      setScanning(false);
    }
  }

  async function handleMatch(folderName: string) {
    setMatching((prev) => new Set(prev).add(folderName));
    try {
      const item = scanned.find((s) => s.folderName === folderName);
      if (item) {
        const matched = await matchScannedAddon(item);
        setScanned((prev) => prev.map((s) => (s.folderName === folderName ? matched : s)));
      }
    } finally {
      setMatching((prev) => {
        const next = new Set(prev);
        next.delete(folderName);
        return next;
      });
    }
  }

  async function handleMatchAll() {
    const unmatched = scanned.filter((s) => !s.matched);
    if (unmatched.length === 0) return;
    setBatchMatching(true);
    try {
      const updated = await matchAllScannedAddons(scanned, (i, total, name) => {
        setBatchProgress(`Matching ${i + 1}/${total}: ${name}`);
      });
      setScanned(updated);
    } finally {
      setBatchMatching(false);
      setBatchProgress(null);
    }
  }

  async function handleAdopt(folderName: string) {
    setAdopting(folderName);
    try {
      const item = scanned.find((s) => s.folderName === folderName);
      if (item && item.matchModId) {
        const result = await adoptScannedAddon(item);
        if (result.adoptError) {
          setScanned((prev) => prev.map((s) => (s.folderName === folderName ? result : s)));
        } else {
          await refresh();
          setScanned((prev) => prev.filter((s) => s.folderName !== folderName));
        }
      }
    } finally {
      setAdopting(null);
    }
  }

  async function handleAdoptAll() {
    const matchable = scanned.filter((s) => s.matched && s.matchModId);
    if (matchable.length === 0) return;
    setBatchAdopting(true);
    try {
      const failed = await adoptAllScannedAddons(scanned, (i, total, name) => {
        setBatchProgress(`Importing ${i + 1}/${total}: ${name}`);
      });
      await refresh();
      if (failed.length > 0) {
        setScanned((prev) =>
          prev
            .map((s) => {
              const f = failed.find((x) => x.folderName === s.folderName);
              return f || (s.matched && s.matchModId ? { ...s, adoptError: undefined } : s);
            })
            .filter((s) => !(s.matched && s.matchModId && !s.adoptError)),
        );
      } else {
        setScanned([]);
      }
    } finally {
      setBatchAdopting(false);
      setBatchProgress(null);
    }
  }

  async function handleImport() {
    setImportProgress(0);
    setImportLabel('');
    setImporting(true);
    try {
      const entries = await importZip();
      if (entries.length > 0) {
        // Re-scan to pick up newly extracted addons
        const results = await scanAddonsFolder();
        setScanned((prev) => {
          const existingNames = new Set(prev.map((s) => s.folderName));
          const newItems = results.filter((r) => !existingNames.has(r.folderName));
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.error('Import failed', err);
    } finally {
      setImporting(false);
    }
  }

  async function handleCheckUpdates() {
    setCheckingUpdates(true);
    setUpdateResults({});
    try {
      const results = await checkAll(installed, gameVersion, (done, total) => {
        setBatchProgress(`Checking ${done}/${total}: ${installed[done - 1]?.name ?? '...'}`);
      });
      setUpdateResults(results);
    } finally {
      setCheckingUpdates(false);
      setBatchProgress(null);
    }
  }

  async function handleInstallUpdate() {
    if (!confirmTarget || !confirmTarget.info.latestFile) return;
    const { addon, info } = confirmTarget;
    const mod = info.latestFile;
    if (!mod) return;
    const updateVersion = getFileGameVersion(mod) || addon.installedVersion || '';
    setConfirmTarget(null);

    const modId = addon.modId;
    setInstallingUpdates((prev) => ({ ...prev, [modId]: { progress: 0, label: 'Starting...' } }));

    try {
      await updateAddon(
        { name: addon.name, slug: addon.slug, id: modId } as any,
        mod.id,
        addon.folderName,
        updateVersion,
        (progress: number, label: string) => {
          setInstallingUpdates((prev) => ({ ...prev, [modId]: { progress, label } }));
        },
        undefined,
        mod.fileName,
      );
      await refresh();
      setUpdateResults((prev) => {
        const next = { ...prev };
        delete next[modId];
        return next;
      });
      setInstallingUpdates((prev) => {
        const next = { ...prev };
        delete next[modId];
        return next;
      });
    } catch (e) {
      setInstallingUpdates((prev) => ({
        ...prev,
        [modId]: { progress: 0, label: 'Failed', error: String(e) },
      }));
      setTimeout(() => {
        setInstallingUpdates((prev) => {
          const next = { ...prev };
          delete next[modId];
          return next;
        });
      }, 8000);
    }
  }

  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (loading || installed.length === 0 || initialCheckDone.current) return;
    initialCheckDone.current = true;
    (async () => {
      const results = await checkAll(installed, gameVersion);
      setUpdateResults(results);
    })();
  }, [loading, installed, checkAll, gameVersion]);

  const updateSummary = useMemo(() => {
    const entries = Object.values(updateResults);
    return {
      updates: entries.filter((r) => r.status === 'update-available').length,
      downgrades: entries.filter((r) => r.status === 'downgrade-available').length,
      done: entries.length,
    };
  }, [updateResults]);

  const unmatchedCount = scanned.filter((s) => !s.matched).length;
  const matchableCount = scanned.filter((s) => s.matched && s.matchModId && !s.adoptError).length;

  if (loading) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <div className='animate-pulse space-y-4'>
          <div className='bg-wow-panel h-8 w-1/3 rounded-sm' />
          <div className='bg-wow-panel h-64 rounded-sm' />
        </div>
      </div>
    );
  }

  if (!addonsFolder) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-20 text-center'>
        <div className='mb-6'>
          <div className='border-wow-border-gold/30 bg-wow-panel mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-sm border'>
            <svg className='text-wow-gold h-8 w-8' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z'
              />
            </svg>
          </div>
          <h2 className='font-wow-heading text-wow-gold mb-2 text-xl tracking-wide'>No Addons Folder Set</h2>
          <p className='text-wow-text-dim mx-auto mb-6 max-w-md'>
            Select your World of Warcraft AddOns folder to start installing and managing addons directly from WowAdder.
          </p>
          <Button variant='primary' size='md' onClick={handlePickFolder}>
            Select AddOns Folder
          </Button>
        </div>
        <div className='bg-wow-panel border-wow-border-light mx-auto mt-8 max-w-md rounded-sm border p-4 text-left'>
          <p className='text-wow-text-muted font-wow-heading mb-1 text-xs tracking-wide uppercase'>
            Typical WoW AddOns path:
          </p>
          <code className='text-wow-text-dim block text-xs'>
            <span className='whitespace-nowrap'>(Folder with WoW.exe)</span>
            /Interface/AddOns
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <div className='mb-6 flex items-center justify-between'>
        <div>
          <h1 className='font-wow-heading text-wow-gold text-xl tracking-wide'>Installed Addons</h1>
          <button
            onClick={() => invoke('open_folder', { path: addonsFolder! })}
            className='text-wow-text-muted hover:text-wow-gold transition-colors'
            title='Open in file manager'
          >
            <span className='flex gap-1'>
              <p className='text-wow-text-muted text-xs'>{addonsFolder}</p>

              <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z'
                />
              </svg>
            </span>
          </button>
        </div>
        <div className='flex items-center gap-2'>
          <Button variant='ghost' size='sm' onClick={handlePickFolder}>
            Change Folder
          </Button>
          <Button variant='primary' size='sm' onClick={handleScan} disabled={scanning}>
            {scanning ?
              <svg className='h-3.5 w-3.5 animate-spin' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
              </svg>
            : null}
            {scanning ? 'Scanning...' : 'Sync'}
          </Button>
          {importing ?
            <div className='flex w-48 items-center gap-2'>
              <Progress value={importProgress} className='flex-1' />
              <span className='text-wow-text-muted shrink-0 text-[10px]'>{importLabel}</span>
            </div>
          : <Button variant='default' size='sm' onClick={handleImport}>
              Import ZIP
            </Button>
          }
          <Button
            variant='outline'
            size='sm'
            onClick={handleCheckUpdates}
            disabled={checkingUpdates || installed.length === 0}
          >
            {checkingUpdates ?
              <svg className='h-3.5 w-3.5 animate-spin' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
              </svg>
            : null}
            {checkingUpdates ?
              'Checking...'
            : `Check Updates${updateSummary.done > 0 ? ` (${updateSummary.updates + updateSummary.downgrades})` : ''}`}
          </Button>
        </div>
      </div>

      {scanned.length > 0 && (
        <div className='mb-6'>
          <div className='mb-2 flex items-center justify-between'>
            <h3 className='font-wow-heading text-wow-quality-orange flex items-center gap-1.5 text-sm tracking-wide'>
              <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path
                  strokeLinecap='round'
                  strokeLinejoin='round'
                  strokeWidth={2}
                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                />
              </svg>
              {scanned.length} external addon{scanned.length !== 1 ? 's' : ''} detected
            </h3>
            <div className='flex items-center gap-2'>
              {unmatchedCount > 0 && (
                <Button variant='default' size='sm' onClick={handleMatchAll} disabled={batchMatching}>
                  {batchMatching ? 'Matching...' : `Match All (${unmatchedCount})`}
                </Button>
              )}
              {matchableCount > 0 && (
                <Button variant='primary' size='sm' onClick={handleAdoptAll} disabled={batchAdopting}>
                  {batchAdopting ? 'Importing...' : `Import All (${matchableCount})`}
                </Button>
              )}
            </div>
          </div>

          {batchProgress && (
            <div className='text-wow-gold bg-wow-border-gold/10 border-wow-border-gold/30 mb-3 flex items-center gap-2 rounded-sm border px-3 py-2 text-xs'>
              <svg className='h-3 w-3 animate-spin' viewBox='0 0 24 24'>
                <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' fill='none' />
                <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z' />
              </svg>
              {batchProgress}
            </div>
          )}

          <div className='space-y-2'>
            {scanned.map((item) => (
              <div
                key={item.folderName}
                className='bg-wow-bg border-wow-quality-orange/30 flex items-center justify-between rounded-sm border p-3'
              >
                <div className='min-w-0 flex-1'>
                  <p className='text-wow-text truncate text-sm font-medium'>{item.name || item.folderName}</p>
                  <p className='text-wow-text-muted text-xs'>
                    {item.folderName}
                    {item.version ? ` v${item.version}` : ''}
                  </p>
                  {item.matchError && <p className='text-wow-quality-orange mt-0.5 text-[10px]'>{item.matchError}</p>}
                  {item.adoptError && <p className='text-wow-danger mt-0.5 text-[10px]'>{item.adoptError}</p>}
                </div>
                <div className='ml-3 flex shrink-0 items-center gap-2'>
                  {item.adoptError ?
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => handleMatch(item.folderName)}
                      disabled={matching.has(item.folderName)}
                    >
                      {matching.has(item.folderName) ? '...' : 'Retry'}
                    </Button>
                  : item.matched && item.matchAddon ?
                    <>
                      <span className='text-wow-quality-green font-wow-heading text-xs tracking-wide'>
                        {item.matchAddon.name}
                      </span>
                      <Button
                        variant='primary'
                        size='sm'
                        onClick={() => handleAdopt(item.folderName)}
                        disabled={adopting === item.folderName || batchAdopting}
                      >
                        {adopting === item.folderName ? '...' : 'Import'}
                      </Button>
                    </>
                  : <Button
                      variant='default'
                      size='sm'
                      onClick={() => handleMatch(item.folderName)}
                      disabled={matching.has(item.folderName) || batchMatching}
                    >
                      {matching.has(item.folderName) ? 'Matching...' : 'Match'}
                    </Button>
                  }
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {installed.length === 0 ?
        <div className='py-20 text-center'>
          <div className='border-wow-border-gold/30 bg-wow-panel mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-sm border'>
            <svg className='text-wow-gold h-6 w-6' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={1.5}
                d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
              />
            </svg>
          </div>
          <p className='text-wow-text-dim font-wow-heading text-sm tracking-wider'>No addons installed</p>
          <p className='text-wow-text-muted mt-1 text-xs'>Browse addons and install them from the addon detail page</p>
          <Link
            to='/'
            className='font-wow-heading bg-wow-gold text-wow-bg hover:bg-wow-gold/90 mt-4 inline-block rounded-sm px-4 py-2 text-sm tracking-wide transition-colors'
          >
            Browse Addons
          </Link>
        </div>
      : <Card className='divide-wow-border-light divide-y'>
          {installed.map((addon) => {
            const updateInfo = updateResults[addon.modId];
            return (
              <div key={addon.modId} className='hover:bg-wow-panel-hover/50 p-4 transition-colors'>
                <div className='flex items-start justify-between gap-4'>
                  <div className='min-w-0 flex-1'>
                    <button
                      onClick={() => navigate(`/addon/${addon.modId}`)}
                      className='font-wow-heading text-wow-text hover:text-wow-gold text-left text-sm tracking-wide transition-colors'
                    >
                      {addon.name}
                    </button>
                    <div className='mt-1 flex flex-wrap gap-1'>
                      {(addon.folderNames?.length ? addon.folderNames : [addon.folderName]).map((f) => (
                        <span key={f} className='bg-wow-panel text-wow-text-muted rounded-sm px-1.5 py-0.5 text-[10px]'>
                          {f}
                        </span>
                      ))}
                    </div>
                    <div className='mt-1 flex items-center gap-3'>
                      <span className='text-wow-text-muted text-[11px]'>v{addon.installedVersion || '?'}</span>
                      <span className='text-wow-text-muted text-[11px]'>
                        {new Date(addon.installedAt).toLocaleDateString()}
                      </span>
                    </div>
                    {updateInfo?.status === 'up-to-date' ?
                      <p className='text-wow-quality-green mt-1 text-[11px]'>Up to date</p>
                    : updateInfo?.status === 'no-compatible-version' ?
                      <p className='text-wow-text-muted mt-1 text-[11px]'>No release files found</p>
                    : updateInfo?.status === 'error' ?
                      <p className='text-wow-danger mt-1 text-[11px]' title={updateInfo.error}>
                        Check failed
                      </p>
                    : null}
                  </div>
                  <div className='flex shrink-0 items-start gap-2'>
                    {installingUpdates[addon.modId] && !installingUpdates[addon.modId].error ?
                      <div className='w-36'>
                        <Progress value={installingUpdates[addon.modId].progress} />
                        <span className='text-wow-text-muted font-wow-heading mt-0.5 block text-right text-[10px]'>
                          {installingUpdates[addon.modId].label}
                        </span>
                      </div>
                    : installingUpdates[addon.modId]?.error ?
                      <Button variant='primary' size='sm' onClick={() => setConfirmTarget({ addon, info: updateInfo! })}>
                        Retry
                      </Button>
                    : updateInfo?.status === 'update-available' && updateInfo.latestFile ?
                      <Button variant='primary' size='sm' onClick={() => setConfirmTarget({ addon, info: updateInfo })}>
                        Update
                      </Button>
                    : updateInfo?.status === 'downgrade-available' && updateInfo.latestFile ?
                      <Button variant='outline' size='sm' onClick={() => setConfirmTarget({ addon, info: updateInfo })}>
                        Downgrade
                      </Button>
                    : null}
                    <Button
                      variant='destructive'
                      size='sm'
                      onClick={() => handleUninstall(addon.modId)}
                      disabled={uninstalling === addon.modId || !!installingUpdates[addon.modId]}
                    >
                      {uninstalling === addon.modId ? 'Removing...' : 'Uninstall'}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      }
      <Dialog
        open={!!confirmTarget}
        onOpenChange={(open) => {
          if (!open) setConfirmTarget(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirmTarget?.info.status === 'downgrade-available' ? 'Downgrade' : 'Update'} Addon</DialogTitle>
            <DialogDescription>{confirmTarget?.addon.name}</DialogDescription>
          </DialogHeader>

          <div className='space-y-3 text-sm'>
            <div>
              <p className='text-wow-text-dim mb-1 text-xs tracking-wide uppercase'>Current</p>
              <div className='bg-wow-bg rounded-sm border p-2 text-xs'>
                <p className='text-wow-text'>File #{confirmTarget?.addon.installedFileId}</p>
                <p className='text-wow-text-muted'>Game: v{confirmTarget?.addon.installedVersion || '?'}</p>
                <p className='text-wow-text-muted'>
                  Installed:{' '}
                  {confirmTarget?.addon.installedAt ? new Date(confirmTarget.addon.installedAt).toLocaleDateString() : '?'}
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <p className='text-wow-text-dim mb-1 text-xs tracking-wide uppercase'>New</p>
              <div className='bg-wow-bg rounded-sm border p-2 text-xs'>
                <p className='text-wow-text'>{confirmTarget?.info.latestFile?.displayName}</p>
                <p className='text-wow-text-muted'>File #{confirmTarget?.info.latestFile?.id} &middot; Release</p>
                <p className='text-wow-text-muted'>
                  Game: {confirmTarget?.info.latestFile?.gameVersions?.join(', ') || '?'}
                </p>
                <p className='text-wow-text-muted'>
                  Released:{' '}
                  {confirmTarget?.info.latestFile?.fileDate ?
                    new Date(confirmTarget.info.latestFile.fileDate).toLocaleDateString()
                  : '?'}
                </p>
                <p className='text-wow-text-muted'>
                  Size:{' '}
                  {confirmTarget?.info.latestFile?.fileLength ? formatBytes(confirmTarget.info.latestFile.fileLength) : '?'}
                </p>
              </div>
            </div>
          </div>

          <div className='mt-4 flex items-center justify-end gap-2'>
            <Button variant='default' size='md' onClick={() => setConfirmTarget(null)}>
              Cancel
            </Button>
            <Button
              variant={confirmTarget?.info.status === 'downgrade-available' ? 'destructive' : 'primary'}
              size='md'
              onClick={handleInstallUpdate}
            >
              {confirmTarget?.info.status === 'downgrade-available' ? 'Downgrade' : 'Update'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
