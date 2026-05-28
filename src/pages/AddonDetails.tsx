import Pagination from '@/components/Pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { WoWSeparator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { open } from '@tauri-apps/plugin-dialog';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import WoWIconFrame from '../components/wow/WoWIcon';
import { useMod, useModDescription, useModFiles } from '../hooks/useCurseforge';
import {
  addWatchFolder,
  getAddonsFolder,
  getDefaultDownloadsFolder,
  installAddon,
  installFromZip,
  isAddonInstalled,
  openCurseForgeDownloadPage,
  pickAddonsFolder,
  removeWatchFolder,
  uninstallAddon,
  watchForDownload,
} from '../services/addonManager';
import { loadPrefs, savePrefs } from '../services/preferences';
import type { CF2File, CF2Pagination } from '../types/curseforge';

const PAGE_SIZE = 10;

const formatSize = (size: number) => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let index = 0;
  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index++;
  }
  return `${size.toFixed(2)} ${units[index]}`;
};

export default function AddonDetails() {
  const { id } = useParams<{ id: string }>();
  const modId = id ? Number(id) : undefined;
  const navigate = useNavigate();
  const location = useLocation();
  const selectedVersions = loadPrefs().versions;
  const autoInstallFileId = (location.state as { autoInstallFileId?: number })?.autoInstallFileId ?? null;
  const handleBack = () => {
    navigate(-1);
  };

  const { data: addon, isLoading: loading, error: addonError } = useMod(modId);

  const { data: description, isLoading: descriptionLoading } = useModDescription(modId);

  const [installedInfo, setInstalledInfo] = useState<ReturnType<typeof isAddonInstalled>>(undefined);
  const [installingFileId, setInstallingFileId] = useState<number | null>(null);
  const [installProgress, setInstallProgress] = useState(0);
  const [installError, setInstallError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [versionFilterEnabled, setVersionFilterEnabled] = useState(true);

  // Download dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogPhase, setDialogPhase] = useState<'setup' | 'watching' | 'found' | 'installing' | 'error'>('setup');
  const [dialogFile, setDialogFile] = useState<CF2File | null>(null);
  const [dialogFolders, setDialogFolders] = useState<string[]>(() => loadPrefs().downloadWatchFolders);
  const [dialogDeleteZip, setDialogDeleteZip] = useState(loadPrefs().deleteZipAfterInstall);
  const [foundZipPath, setFoundZipPath] = useState<string | null>(null);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const filteredFilesQuery = useModFiles(modId, {
    gameVersionTypeId: 517,
    index: 0,
    pageSize: 2000,
  });

  const rawFiles = filteredFilesQuery.data?.files.length ? filteredFilesQuery.data.files : (addon?.latestFiles ?? []);
  const filesLoading = filteredFilesQuery.isLoading;

  const allFilteredFiles = useMemo(() => {
    if (!versionFilterEnabled || selectedVersions.length === 0) return rawFiles;
    return rawFiles.filter((f: CF2File) => f.gameVersions?.some((v: string) => selectedVersions.includes(v)));
  }, [rawFiles, selectedVersions, versionFilterEnabled]);

  const files = allFilteredFiles.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  const pagination: CF2Pagination | null = {
    index: currentPage * PAGE_SIZE,
    pageSize: PAGE_SIZE,
    resultCount: Math.min(allFilteredFiles.length - currentPage * PAGE_SIZE, PAGE_SIZE),
    totalCount: allFilteredFiles.length,
  };

  const autoInstallRef = useRef(false);
  useEffect(() => {
    if (!autoInstallFileId || autoInstallRef.current || !addon || filesLoading || rawFiles.length === 0) return;
    const file = rawFiles.find((f) => f.id === autoInstallFileId);
    if (!file) return;
    autoInstallRef.current = true;
    handleInstallFile(file);
  }, [autoInstallFileId, addon, filesLoading, rawFiles]);

  useEffect(() => {
    if (!addon) return;
    const info = isAddonInstalled(addon.id);
    setInstalledInfo(info);
  }, [addon]);

  useEffect(() => {
    if (installingFileId === null) return;
    const unlisten = listen<number>('install-progress', (event) => {
      setInstallProgress(event.payload);
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [installingFileId]);

  async function handleInstallFile(file: CF2File) {
    if (!addon) {
      console.log('[DEBUG] handleInstallFile: no addon loaded, returning early');
      return;
    }

    const prefs = loadPrefs();
    if (prefs.supportDevs) {
      openDownloadDialog(file);
      return;
    }

    console.log('[DEBUG] handleInstallFile called', {
      addonId: addon.id,
      addonName: addon.name,
      fileId: file.id,
      fileName: file.displayName,
      downloadUrl: file.downloadUrl,
      slug: addon.slug,
      gameVersions: file.gameVersions,
    });
    setInstallError(null);
    setInstallProgress(0);
    setInstallingFileId(file.id);
    try {
      console.log('[DEBUG] Checking addons folder...');
      let folder = await getAddonsFolder();
      console.log('[DEBUG] getAddonsFolder returned:', folder);
      if (!folder) {
        console.log('[DEBUG] No folder set, opening picker...');
        folder = await pickAddonsFolder();
        console.log('[DEBUG] pickAddonsFolder returned:', folder);
        if (!folder) {
          console.log('[DEBUG] User cancelled folder picker');
          setInstallError('No AddOns folder selected');
          return;
        }
      }
      console.log('[DEBUG] Calling installAddon with:', {
        addonId: addon.id,
        fileId: file.id,
        fileName: file.fileName,
        slug: addon.slug,
        version: file.gameVersions?.slice(-1)[0] ?? null,
        downloadUrl: file.downloadUrl,
      });
      await installAddon(
        addon,
        file.id,
        addon.slug,
        file.gameVersions?.slice(-1)[0] ?? null,
        file.downloadUrl,
        file.fileName,
      );
      console.log('[DEBUG] installAddon completed successfully');
      setInstalledInfo(isAddonInstalled(addon.id));
    } catch (err) {
      console.log('[DEBUG] installAddon threw an error:', err);
      const msg = err instanceof Error ? err.message : 'Install failed';
      console.log('[DEBUG] Error message:', msg);
      if (err instanceof Error && err.stack) {
        console.log('[DEBUG] Error stack:', err.stack);
      }
      setInstallError(msg);
    } finally {
      console.log('[DEBUG] handleInstallFile finally block, setting installingFileId=null');
      setInstallingFileId(null);
    }
  }

  async function handleUninstall() {
    if (!addon) return;
    try {
      await uninstallAddon(addon.id);
      setInstalledInfo(undefined);
    } catch (err) {
      console.error('Uninstall failed', err);
    }
  }

  async function openDownloadDialog(file: CF2File) {
    if (!addon) return;
    const prefs = loadPrefs();
    let folders = prefs.downloadWatchFolders;

    if (folders.length === 0) {
      const defaultPath = await getDefaultDownloadsFolder();
      if (defaultPath) {
        addWatchFolder(defaultPath);
        folders = [defaultPath];
      }
    }

    setDialogFile(file);
    setDialogFolders(folders);
    setDialogDeleteZip(prefs.deleteZipAfterInstall);
    setDialogPhase('setup');
    setFoundZipPath(null);
    setDialogError(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    abortRef.current?.abort();
    setDialogOpen(false);
  }

  async function handleAddFolder() {
    const selected = await open({
      directory: true,
      multiple: false,
      title: 'Select a download folder to watch',
    });
    if (selected && typeof selected === 'string' && !dialogFolders.includes(selected)) {
      const next = [...dialogFolders, selected];
      setDialogFolders(next);
      addWatchFolder(selected);
    }
  }

  function handleRemoveFolder(path: string) {
    const next = dialogFolders.filter((f) => f !== path);
    setDialogFolders(next);
    removeWatchFolder(path);
  }

  function handleDeleteZipToggle() {
    const next = !dialogDeleteZip;
    setDialogDeleteZip(next);
    savePrefs({ deleteZipAfterInstall: next });
  }

  async function handleOpenDownloadPage() {
    if (!addon || !dialogFile) return;
    setDialogPhase('watching');
    setDialogError(null);

    await openCurseForgeDownloadPage(addon.slug, dialogFile.id);

    const controller = new AbortController();
    abortRef.current = controller;

    const path = await watchForDownload(dialogFile.fileName, dialogFolders, controller.signal);
    if (path) {
      setFoundZipPath(path);
      setDialogPhase('found');
      const win = getCurrentWindow();
      await win.setAlwaysOnTop(true);
      await win.show();
      await win.unminimize();
      await win.setFocus();
      await win.setAlwaysOnTop(false);
    } else if (!controller.signal.aborted) {
      setDialogError('Download was not detected within 5 minutes. Try again.');
      setDialogPhase('error');
    }
  }

  async function handleInstallFromFoundZip() {
    if (!addon || !dialogFile || !foundZipPath) return;

    abortRef.current?.abort();
    setDialogPhase('installing');
    setInstallProgress(0);
    setInstallingFileId(dialogFile.id);

    try {
      let folder = await getAddonsFolder();
      if (!folder) {
        folder = await pickAddonsFolder();
        if (!folder) {
          setDialogError('No AddOns folder selected');
          setDialogPhase('error');
          return;
        }
      }

      await installFromZip(
        foundZipPath,
        addon,
        dialogFile.id,
        addon.slug,
        dialogFile.gameVersions?.slice(-1)[0] ?? null,
        dialogDeleteZip,
      );

      setInstalledInfo(isAddonInstalled(addon.id));
      setDialogOpen(false);
    } catch (err) {
      setDialogError(err instanceof Error ? err.message : 'Install failed');
      setDialogPhase('error');
    } finally {
      setInstallingFileId(null);
    }
  }

  const totalPages = pagination ? Math.ceil(pagination.totalCount / pagination.pageSize) : 0;

  if (loading) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-8'>
        <div className='animate-pulse space-y-4'>
          <div className='bg-wow-panel h-8 w-1/3 rounded-sm' />
          <div className='bg-wow-panel h-4 w-2/3 rounded-sm' />
          <div className='bg-wow-panel h-64 rounded-sm' />
        </div>
      </div>
    );
  }

  const errorMessage = addonError instanceof Error ? addonError.message : null;

  if (errorMessage || !addon) {
    return (
      <div className='mx-auto max-w-4xl px-4 py-20 text-center'>
        <p className='text-wow-danger font-wow-heading text-lg tracking-wider'>{errorMessage || 'Addon not found'}</p>
        <Link to='/' className='text-wow-gold hover:text-wow-gold/80 font-wow-heading mt-2 inline-block tracking-wide'>
          Back to browse
        </Link>
      </div>
    );
  }

  const downloadCount = addon.downloadCount.toLocaleString();

  return (
    <div className='mx-auto max-w-4xl px-4 py-8'>
      <button
        onClick={handleBack}
        className='text-wow-text-dim hover:text-wow-gold font-wow-heading mb-6 flex items-center gap-1 text-sm tracking-wide transition-colors'
      >
        <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
        </svg>
        Back
      </button>

      <Card className='mb-8 p-6'>
        <div className='flex gap-6'>
          <WoWIconFrame size='lg'>
            {addon.logo?.url ?
              <img src={addon.logo.url} alt={addon.name} className='h-full w-full object-cover' />
            : <div className='text-wow-text-muted flex h-full w-full items-center justify-center'>
                <svg className='h-10 w-10' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={1.5}
                    d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
                  />
                </svg>
              </div>
            }
          </WoWIconFrame>
          <div className='flex-1'>
            <h1 className='font-wow-heading text-wow-gold text-2xl tracking-wide'>{addon.name}</h1>
            <p className='text-wow-text-dim mt-1'>{addon.summary}</p>
            <div className='mt-3 flex items-center gap-4'>
              <span className='text-wow-text-muted text-sm'>{downloadCount} downloads</span>
              {addon.gamePopularityRank > 0 && (
                <span className='text-wow-text-muted text-sm'>
                  #<span className='text-wow-gold'>{addon.gamePopularityRank}</span> popular
                </span>
              )}
              {addon.links?.websiteUrl && (
                <a
                  href={addon.links.websiteUrl}
                  target='_blank'
                  rel='noopener noreferrer'
                  className='text-wow-gold hover:text-wow-gold/80 font-wow-heading text-sm tracking-wide'
                >
                  CurseForge Page
                </a>
              )}
              {installedInfo ?
                <span className='bg-wow-quality-purple/10 text-wow-quality-purple border-wow-quality-purple/30 flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs'>
                  <svg className='h-3 w-3' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                  </svg>
                  Installed v{installedInfo.installedVersion || '?'}
                </span>
              : null}
            </div>
            <div className='mt-3 flex flex-wrap gap-1.5'>
              {addon.categories?.map((cat) => (
                <Badge key={cat.id} variant='info'>
                  {cat.name}
                </Badge>
              ))}
            </div>
            <div className='text-wow-text-muted mt-2 flex flex-wrap gap-1.5 text-sm'>
              {'By '}
              {addon.authors?.map((author) => (
                <span key={author.id} className='text-wow-text-muted bg-wow-border content-center rounded-sm px-1.5 text-xs'>
                  {author.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card className='p-6'>
        {installError && (
          <div className='text-wow-danger bg-wow-danger/10 border-wow-danger/30 mb-4 flex items-center gap-2 rounded-sm border px-4 py-3 text-sm'>
            <svg className='h-4 w-4 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
              />
            </svg>
            <span>{installError}</span>
            <button onClick={() => setInstallError(null)} className='text-wow-danger/60 hover:text-wow-danger ml-auto'>
              <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        )}

        <div className='mb-4 flex items-center justify-between'>
          <h2 className='font-wow-heading text-wow-gold text-lg tracking-wide'>Files</h2>
          <div className='flex items-center gap-4'>
            {pagination && (
              <p className='text-wow-text-muted text-xs'>
                {pagination.totalCount.toLocaleString()} files
                {versionFilterEnabled && selectedVersions.length > 0 && ` for selected game versions`}
              </p>
            )}
            {selectedVersions.length > 0 && (
              <label className='flex cursor-pointer items-center gap-2'>
                <span className='text-wow-text-dim text-xs'>All versions</span>
                <Switch
                  checked={!versionFilterEnabled}
                  onCheckedChange={(checked: boolean) => {
                    setVersionFilterEnabled(!checked);
                    setCurrentPage(0);
                  }}
                />
              </label>
            )}
          </div>
        </div>

        <div className='space-y-2'>
          {filesLoading ?
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className='bg-wow-panel border-wow-border-light animate-pulse rounded-sm border p-4'>
                <div className='bg-wow-panel-hover mb-2 h-4 w-1/3 rounded' />
                <div className='bg-wow-panel-hover/70 h-3 w-1/2 rounded' />
              </div>
            ))
          : <>
              {files.map((file) => (
                <div
                  key={file.id}
                  className='bg-wow-bg border-wow-border-light hover:border-wow-border-gold/50 rounded-sm border p-4 transition-colors'
                >
                  <div className='flex items-start justify-between gap-4'>
                    <div className='min-w-0 flex-1'>
                      <div className='flex items-center gap-2'>
                        <span className='font-wow-heading text-wow-text text-sm tracking-wide'>{file.displayName}</span>
                        {file.releaseType === 1 && <Badge variant='release'>Release</Badge>}
                        {file.releaseType === 2 && <Badge variant='beta'>Beta</Badge>}
                        {file.releaseType === 3 && <Badge variant='alpha'>Alpha</Badge>}
                      </div>
                      {file.gameVersions && file.gameVersions.length > 0 && (
                        <div className='mt-1.5 flex flex-wrap gap-1'>
                          {file.gameVersions.map((v) => (
                            <span
                              key={v}
                              className={`rounded-sm px-1.5 py-0.5 text-[10px] ${
                                selectedVersions.includes(v) ?
                                  'text-wow-gold bg-wow-border-gold/10 border-wow-border-gold/30 border'
                                : 'text-wow-text-muted bg-wow-panel'
                              }`}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className='text-wow-text-muted mt-1 text-xs'>
                        {new Date(file.fileDate).toLocaleDateString()} &middot; {formatSize(file.fileLength)}
                      </p>
                    </div>
                    <div className='flex shrink-0 items-center gap-2'>
                      {installingFileId === file.id ?
                        <div className='w-32'>
                          <div className='bg-wow-panel border-wow-border-gold/30 relative h-2 overflow-hidden rounded-sm border'>
                            <div
                              className='from-wow-border-gold to-wow-gold absolute inset-0 bg-linear-to-r transition-all duration-300'
                              style={{ width: `${installProgress}%` }}
                            />
                          </div>
                          <span className='text-wow-text-muted font-wow-heading mt-0.5 block text-right text-[10px]'>
                            {installProgress}%
                          </span>
                        </div>
                      : installedInfo && installedInfo.installedFileId === file.id ?
                        <Button variant='destructive' onClick={handleUninstall}>
                          Uninstall
                        </Button>
                      : <Button variant='primary' onClick={() => handleInstallFile(file)}>
                          Install
                        </Button>
                      }
                    </div>
                  </div>
                </div>
              ))}
              {files.length === 0 && <p className='text-wow-text-muted py-8 text-center text-sm'>No files available</p>}
            </>
          }
        </div>

        {totalPages > 1 && (
          <div className='border-wow-border-light mt-6 flex justify-center border-t pt-4'>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </div>
        )}

        <WoWSeparator className='my-6' />

        <h2 className='font-wow-heading text-wow-gold mb-4 text-lg tracking-wide'>Description</h2>
        {descriptionLoading ?
          <div className='animate-pulse space-y-2'>
            <div className='bg-wow-panel h-3 w-3/4 rounded' />
            <div className='bg-wow-panel h-3 w-1/2 rounded' />
            <div className='bg-wow-panel h-3 w-5/6 rounded' />
          </div>
        : description ?
          <div
            className='prose prose-invert prose-sm **:text-wow-text-dim [&_a]:text-wow-gold [&_a:hover]:text-wow-gold/80 [&_h1]:font-wow-heading [&_h1]:text-wow-gold [&_h2]:font-wow-heading [&_h2]:text-wow-gold [&_h3]:text-wow-text [&_li]:text-wow-text-dim [&_p]:text-wow-text-dim [&_blockquote]:border-wow-border-gold/40 [&_blockquote]:text-wow-text-muted [&_pre]:bg-wow-panel [&_pre]:border-wow-border-light [&_code]:bg-wow-panel [&_th]:text-wow-text [&_th]:font-wow-heading [&_td]:text-wow-text-dim [&_tr]:border-wow-border-light] max-w-none [&_blockquote]:border-l-4 [&_blockquote]:pl-4 [&_code]:rounded-sm [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-xs [&_h1]:text-lg [&_h1]:tracking-wide [&_h2]:text-base [&_h2]:tracking-wide [&_h3]:text-sm [&_h3]:font-medium [&_img]:max-w-full [&_img]:rounded-sm [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-sm [&_pre]:border [&_pre]:p-4 [&_table]:w-full [&_td]:px-3 [&_td]:py-2 [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_tr]:border-b [&_ul]:list-disc [&_ul]:pl-5'
            dangerouslySetInnerHTML={{ __html: description }}
          />
        : <p className='text-wow-text-muted text-sm'>No description available.</p>}
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className='w-full max-w-md p-6'>
          <DialogTitle>
            {dialogPhase === 'setup' && 'Install via Browser'}
            {dialogPhase === 'watching' && 'Waiting for Download...'}
            {dialogPhase === 'found' && 'Download Found!'}
            {dialogPhase === 'installing' && 'Installing...'}
            {dialogPhase === 'error' && 'Error'}
          </DialogTitle>

          {dialogPhase === 'setup' && (
            <>
              <DialogDescription>
                Open the CurseForge download page for <span className='text-wow-gold'>{dialogFile?.displayName}</span> in
                your browser. When the download finishes, WowAdder will detect it automatically.
              </DialogDescription>

              <div className='mt-4'>
                <p className='text-wow-text-dim mb-2 text-xs'>Watched folders:</p>
                <div className='max-h-32 space-y-1 overflow-y-auto'>
                  {dialogFolders.length === 0 ?
                    <p className='text-wow-text-muted text-xs italic'>No folders added yet. Add one below.</p>
                  : dialogFolders.map((f) => (
                      <div
                        key={f}
                        className='bg-wow-bg border-wow-border-light flex items-center justify-between rounded-sm border px-2 py-1.5'
                      >
                        <span className='text-wow-text-dim truncate text-xs'>{f}</span>
                        <button
                          onClick={() => handleRemoveFolder(f)}
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
                  onClick={handleAddFolder}
                  className='text-wow-gold-dim hover:text-wow-gold mt-2 flex items-center gap-1 text-xs tracking-wide transition-colors'
                >
                  <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 4v16m8-8H4' />
                  </svg>
                  Add folder
                </button>
              </div>

              <label className='mt-4 flex cursor-pointer items-center gap-2'>
                <button
                  role='switch'
                  aria-checked={dialogDeleteZip}
                  onClick={handleDeleteZipToggle}
                  className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                    dialogDeleteZip ?
                      'border-wow-border-gold-bright bg-wow-gold shadow-[0_0_6px_rgba(251,191,36,0.15)]'
                    : 'border-wow-border-light bg-wow-bg'
                  }`}
                >
                  <span
                    className={`bg-wow-panel inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
                      dialogDeleteZip ? 'translate-x-4.5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className='text-wow-text-dim text-xs'>Delete ZIP after install</span>
              </label>

              <div className='mt-4 flex items-center gap-2'>
                <Button
                  variant='primary'
                  onClick={handleOpenDownloadPage}
                  disabled={dialogFolders.length === 0}
                  size='md'
                  className='flex-1'
                >
                  Open CurseForge Download Page
                </Button>
                <Button variant='ghost' onClick={closeDialog}>
                  Cancel
                </Button>
              </div>
              {dialogFolders.length === 0 && (
                <p className='text-wow-text-muted mt-2 text-xs'>Add at least one folder to watch for downloads.</p>
              )}
            </>
          )}

          {dialogPhase === 'watching' && (
            <>
              <div className='flex items-center gap-3'>
                <div className='border-wow-border-gold border-t-wow-gold h-5 w-5 animate-spin rounded-full border-2 border-r-transparent' />
                <DialogDescription>
                  Watching {dialogFolders.length} folder{dialogFolders.length !== 1 ? 's' : ''} for{' '}
                  <span className='text-wow-gold'>{dialogFile?.fileName}</span>...
                </DialogDescription>
              </div>
              <Button
                variant='ghost'
                onClick={() => {
                  abortRef.current?.abort();
                  setDialogPhase('setup');
                }}
                className='mt-4 w-full'
              >
                Cancel
              </Button>
            </>
          )}

          {dialogPhase === 'found' && (
            <>
              <div className='bg-wow-quality-purple/10 border-wow-quality-purple/30 flex items-center gap-2 rounded-sm border p-3'>
                <svg
                  className='text-wow-quality-purple h-5 w-5 shrink-0'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                </svg>
                <span className='text-wow-text text-sm'>
                  <span className='text-wow-gold'>{dialogFile?.fileName}</span> found
                </span>
              </div>
              <div className='mt-4 flex items-center gap-2'>
                <Button variant='primary' onClick={handleInstallFromFoundZip} size='md' className='flex-1'>
                  Install
                </Button>
                <Button variant='ghost' onClick={closeDialog}>
                  Cancel
                </Button>
              </div>
            </>
          )}

          {dialogPhase === 'installing' && (
            <>
              <div className='bg-wow-panel border-wow-border-gold/30 relative h-2 overflow-hidden rounded-sm border'>
                <div
                  className='from-wow-border-gold to-wow-gold absolute inset-0 bg-linear-to-r transition-all duration-300'
                  style={{ width: `${installProgress}%` }}
                />
              </div>
              <span className='text-wow-text-muted font-wow-heading mt-1 block text-right text-xs'>{installProgress}%</span>
            </>
          )}

          {dialogPhase === 'error' && (
            <>
              <div className='text-wow-danger bg-wow-danger/10 border-wow-danger/30 flex items-center gap-2 rounded-sm border p-3 text-sm'>
                <svg className='h-4 w-4 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z'
                  />
                </svg>
                <span>{dialogError}</span>
              </div>
              <div className='mt-4 flex items-center gap-2'>
                <Button
                  variant='primary'
                  onClick={() => {
                    setDialogPhase('setup');
                    setDialogError(null);
                  }}
                  className='flex-1'
                >
                  Try Again
                </Button>
                <Button variant='ghost' onClick={closeDialog}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
