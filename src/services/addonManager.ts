import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from '@tauri-apps/plugin-fs';
import { openUrl } from '@tauri-apps/plugin-opener';
import { load } from '@tauri-apps/plugin-store';
import type { CF2Addon } from '../types/curseforge';
import { getMod, getModFileDownloadUrl, searchMods } from './curseforge';
import { DEFAULTS, loadPrefs, savePrefs } from './preferences';

const STORE_FILE = 'wowadder-config.json';

let storePromise: ReturnType<typeof load> | null = null;
function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { defaults: DEFAULTS, autoSave: true });
  }
  return storePromise;
}

export interface InstalledAddon {
  modId: number;
  name: string;
  slug: string;
  folderName: string;
  folderNames?: string[];
  installedFileId: number;
  installedVersion: string | null;
  installedAt: string;
  author?: string;
}

export interface AddonDb {
  version: number;
  addonsFolder: string;
  installed: InstalledAddon[];
}

const DB_FILENAME = '.wowadder/db.json';

let cachedDb: AddonDb | null = null;
let cachedInstallMap: Map<number, InstalledAddon> | null = null;
let cachedFolder: string | null = null;

function getDefaultDb(addonsFolder: string): AddonDb {
  return { version: 1, addonsFolder, installed: [] };
}

function dbPath(addonsFolder: string): string {
  return `${addonsFolder}/${DB_FILENAME}`;
}

export async function getAddonsFolder(): Promise<string | null> {
  if (cachedFolder) return cachedFolder;
  const store = await getStore();
  let stored = await store.get<string>('addonsFolder');
  if (!stored) {
    const legacy = localStorage.getItem('wowadder_addons_folder');
    if (legacy) {
      await store.set('addonsFolder', legacy);
      localStorage.removeItem('wowadder_addons_folder');
      stored = legacy;
    }
  }
  if (stored) cachedFolder = stored;
  return stored ?? null;
}

export async function setAddonsFolder(path: string): Promise<void> {
  const store = await getStore();
  await store.set('addonsFolder', path);
  cachedFolder = path;
  cachedDb = null;
  cachedInstallMap = null;
}

export async function pickAddonsFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: 'Select your WoW AddOns folder',
  });
  if (selected && typeof selected === 'string') {
    await setAddonsFolder(selected);
    return selected;
  }
  return null;
}

async function ensureDbFile(addonsFolder: string): Promise<void> {
  const path = dbPath(addonsFolder);
  const dir = `${addonsFolder}/.wowadder`;
  const dirExists = await exists(dir);
  if (!dirExists) {
    await mkdir(dir);
  }
  const fileExists = await exists(path);
  if (!fileExists) {
    await writeTextFile(path, JSON.stringify(getDefaultDb(addonsFolder), null, 2));
  }
}

export async function loadDb(): Promise<AddonDb | null> {
  const folder = await getAddonsFolder();
  if (!folder) return null;
  if (cachedDb && cachedFolder === folder) return cachedDb;

  try {
    await ensureDbFile(folder);
    const content = await readTextFile(dbPath(folder));
    const db = JSON.parse(content) as AddonDb;
    cachedDb = db;
    cachedFolder = folder;
    cachedInstallMap = new Map(db.installed.map((a) => [a.modId, a]));
    return db;
  } catch {
    const db = getDefaultDb(folder);
    cachedDb = db;
    cachedInstallMap = new Map();
    return db;
  }
}

export async function saveDb(db: AddonDb): Promise<void> {
  const folder = db.addonsFolder;
  await ensureDbFile(folder);
  await writeTextFile(dbPath(folder), JSON.stringify(db, null, 2));
  cachedDb = db;
  cachedInstallMap = new Map(db.installed.map((a) => [a.modId, a]));
}

export function isAddonInstalled(modId: number): InstalledAddon | undefined {
  return cachedInstallMap?.get(modId);
}

export function getInstalledAddons(): InstalledAddon[] {
  return cachedDb?.installed ?? [];
}

export async function installAddon(
  addon: CF2Addon,
  fileId: number,
  folderName: string,
  version: string | null,
  fileDownloadUrl?: string,
  fileName?: string,
): Promise<void> {
  console.log('[DEBUG installAddon] Starting install:', {
    addonId: addon.id,
    fileId,
    folderName,
    version,
    fileDownloadUrl,
    fileName,
    hasDownloadUrl: !!fileDownloadUrl,
  });

  const folder = await getAddonsFolder();
  console.log('[DEBUG installAddon] getAddonsFolder:', folder);
  if (!folder) throw new Error('Addons folder not configured');

  const db = await loadDb();
  console.log(
    '[DEBUG installAddon] loadDb result:',
    db ? { addonsFolder: db.addonsFolder, installedCount: db.installed.length } : null,
  );
  if (!db) throw new Error('Could not load database');

  const existing = db.installed.find((a) => a.modId === addon.id);
  console.log('[DEBUG installAddon] existing entry:', existing);
  if (existing) {
    console.log('[DEBUG installAddon] Upgrading existing installation:', existing);
    // Install new version first, then remove old folders (safe rollback)
  }

  let downloadUrl: string | undefined | null = fileDownloadUrl;
  if (!downloadUrl) {
    console.log('[DEBUG installAddon] No fileDownloadUrl, trying CDN construct with fileName:', fileName);
    if (fileName) {
      const chunk1 = Math.floor(fileId / 1000);
      const chunk2 = fileId % 1000;
      downloadUrl = `https://edge.forgecdn.net/files/${chunk1}/${chunk2}/${fileName}`;
      console.log('[DEBUG installAddon] Constructed CDN URL:', downloadUrl);
    }
  }
  if (!downloadUrl) {
    console.log('[DEBUG installAddon] CDN construct failed, calling getModFileDownloadUrl API...');
    try {
      downloadUrl = await getModFileDownloadUrl(addon.id, fileId);
      console.log('[DEBUG installAddon] getModFileDownloadUrl returned:', downloadUrl);
    } catch (apiErr) {
      console.log('[DEBUG installAddon] getModFileDownloadUrl threw:', apiErr);
    }
  }
  if (!downloadUrl) {
    throw new Error(`Could not get download URL for file ${fileId} (addon ${addon.id}).`);
  }
  console.log('[DEBUG installAddon] Using downloadUrl:', downloadUrl);

  let entries: string[] = [folderName];
  console.log("[DEBUG installAddon] Calling invoke('install_addon')...");
  try {
    const result = await invoke<string>('install_addon', {
      downloadUrl,
      targetDir: folder,
      folderName,
    });
    console.log('[DEBUG installAddon] install_addon invoke succeeded, result:', result);
    const parsed = JSON.parse(result);
    if (parsed.entries && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
      entries = parsed.entries;
    }
  } catch (invokeErr) {
    console.log('[DEBUG installAddon] install_addon invoke FAILED:', invokeErr);
    if (invokeErr instanceof Error) {
      console.log('[DEBUG installAddon] invoke error message:', invokeErr.message);
      console.log('[DEBUG installAddon] invoke error stack:', invokeErr.stack);
    }
    throw invokeErr;
  }

  if (existing) {
    const oldFolders = existing.folderNames?.length ? existing.folderNames : [existing.folderName];
    for (const name of oldFolders) {
      const dir = `${folder}/${name}`;
      if (await exists(dir)) {
        await remove(dir, { recursive: true });
      }
    }
    existing.folderName = entries[0];
    existing.folderNames = entries;
    existing.installedFileId = fileId;
    existing.installedVersion = version;
    existing.installedAt = new Date().toISOString();
    console.log('[DEBUG installAddon] Updated existing entry');
  } else {
    db.installed.push({
      modId: addon.id,
      name: addon.name,
      slug: addon.slug,
      folderName: entries[0],
      folderNames: entries,
      installedFileId: fileId,
      installedVersion: version,
      installedAt: new Date().toISOString(),
    });
    console.log('[DEBUG installAddon] Pushed new entry');
  }

  await saveDb(db);
  console.log('[DEBUG installAddon] saveDb complete');
}

export async function uninstallAddon(modId: number): Promise<void> {
  const db = await loadDb();
  if (!db) throw new Error('Could not load database');

  const entry = db.installed.find((a) => a.modId === modId);
  if (!entry) throw new Error('Addon not found in database');

  const folderNames = entry.folderNames?.length ? entry.folderNames : [entry.folderName];
  for (const name of folderNames) {
    const addonPath = `${db.addonsFolder}/${name}`;
    const pathExists = await exists(addonPath);
    if (pathExists) {
      console.log('[DEBUG uninstallAddon] Removing:', addonPath);
      await remove(addonPath, { recursive: true });
    }
  }

  db.installed = db.installed.filter((a) => a.modId !== modId);
  await saveDb(db);
}

export interface ScannedAddon {
  folderName: string;
  name: string | null;
  version: string | null;
  matched: boolean;
  matchModId?: number;
  matchAddon?: CF2Addon;
  matchError?: string;
  adoptError?: string;
}

async function findTocFiles(dirPath: string): Promise<{ name: string | null; version: string | null } | null> {
  try {
    const entries = await readDir(dirPath);
    for (const entry of entries) {
      if (entry.name && entry.name.endsWith('.toc') && !entry.isDirectory) {
        const content = await readTextFile(`${dirPath}/${entry.name}`);
        let name: string | null = null;
        let version: string | null = null;
        for (const line of content.split('\n')) {
          const trimmed = line.trim();
          if (trimmed.startsWith('## Title: ')) name = trimmed.slice(10).trim();
          else if (trimmed.startsWith('## Version: ')) version = trimmed.slice(12).trim();
        }
        return { name, version };
      }
      if (entry.name && entry.isDirectory && !entry.name.startsWith('.')) {
        const sub = await findTocFiles(`${dirPath}/${entry.name}`);
        if (sub) return sub;
      }
    }
  } catch {
    // skip unreadable directories
  }
  return null;
}

export async function scanAddonsFolder(): Promise<ScannedAddon[]> {
  const folder = await getAddonsFolder();
  if (!folder) return [];

  const entries = await readDir(folder);
  const results: ScannedAddon[] = [];
  const db = await loadDb();

  const isAlreadyTracked = (folderName: string): boolean => {
    if (!db) return false;
    return db.installed.some((a) => a.folderName === folderName || (a.folderNames && a.folderNames.includes(folderName)));
  };

  for (const entry of entries) {
    if (!entry.name || !entry.isDirectory) continue;
    if (entry.name.startsWith('.')) continue;
    if (entry.name === '..' || entry.name === '.') continue;
    if (isAlreadyTracked(entry.name)) continue;

    const toc = await findTocFiles(`${folder}/${entry.name}`);

    results.push({
      folderName: entry.name,
      name: toc?.name ?? null,
      version: toc?.version ?? null,
      matched: false,
    });
  }

  return results;
}

export async function matchScannedAddon(scanned: ScannedAddon): Promise<ScannedAddon> {
  if (scanned.matched) return scanned;

  try {
    const searchName = scanned.name || scanned.folderName;
    const result = await searchMods({ searchFilter: searchName, pageSize: 10 });
    const addons = result.addons;

    if (addons.length === 0) {
      return { ...scanned, matched: false, matchError: 'No results from CurseForge' };
    }

    const searchLower = searchName.toLowerCase();
    const folderLower = scanned.folderName.toLowerCase();

    const exactName = addons.find((a) => a.name.toLowerCase() === searchLower);
    if (exactName) {
      return { ...scanned, matched: true, matchModId: exactName.id, matchAddon: exactName };
    }

    const exactFolder = addons.find((a) => a.slug?.toLowerCase() === folderLower || a.name.toLowerCase() === folderLower);
    if (exactFolder) {
      return { ...scanned, matched: true, matchModId: exactFolder.id, matchAddon: exactFolder };
    }

    const partialName = addons.find(
      (a) => a.name.toLowerCase().includes(searchLower) || searchLower.includes(a.name.toLowerCase()),
    );
    if (partialName) {
      return { ...scanned, matched: true, matchModId: partialName.id, matchAddon: partialName };
    }

    return {
      ...scanned,
      matched: true,
      matchModId: addons[0].id,
      matchAddon: addons[0],
      matchError: `Best guess: "${addons[0].name}"`,
    };
  } catch (err) {
    return {
      ...scanned,
      matched: false,
      matchError: err instanceof Error ? err.message : 'Match request failed',
    };
  }
}

export async function adoptScannedAddon(scanned: ScannedAddon): Promise<ScannedAddon> {
  if (!scanned.matchModId) {
    return { ...scanned, adoptError: 'No match to adopt' };
  }

  try {
    const folder = await getAddonsFolder();
    if (!folder) throw new Error('Addons folder not configured');

    const db = await loadDb();
    if (!db) throw new Error('Could not load database');

    const alreadyInDb = db.installed.find(
      (a) => a.folderName === scanned.folderName || (a.folderNames && a.folderNames.includes(scanned.folderName)),
    );
    if (alreadyInDb) {
      return { ...scanned, adoptError: 'Already in database' };
    }

    const addon = scanned.matchAddon || (await getMod(scanned.matchModId));
    if (!addon) throw new Error('Could not load addon data');

    db.installed.push({
      modId: addon.id,
      name: addon.name,
      slug: addon.slug,
      folderName: scanned.folderName,
      installedFileId: addon.mainFileId,
      installedVersion: scanned.version,
      installedAt: new Date().toISOString(),
    });

    await saveDb(db);
    return { ...scanned, adoptError: undefined };
  } catch (err) {
    return {
      ...scanned,
      adoptError: err instanceof Error ? err.message : 'Adoption failed',
    };
  }
}

export async function matchAllScannedAddons(
  scanned: ScannedAddon[],
  onProgress?: (matched: number, total: number, name: string) => void,
): Promise<ScannedAddon[]> {
  const results: ScannedAddon[] = [];
  for (let i = 0; i < scanned.length; i++) {
    const item = scanned[i];
    if (item.matched) {
      results.push(item);
      continue;
    }
    onProgress?.(i, scanned.length, item.name || item.folderName);
    const matched = await matchScannedAddon(item);
    results.push(matched);
  }
  return results;
}

export async function adoptAllScannedAddons(
  scanned: ScannedAddon[],
  onProgress?: (adopted: number, total: number, name: string) => void,
): Promise<ScannedAddon[]> {
  const results: ScannedAddon[] = [];
  let adoptedCount = 0;
  for (const item of scanned) {
    if (!item.matched || !item.matchModId) {
      results.push({ ...item, adoptError: item.adoptError || 'Not matched' });
      continue;
    }
    onProgress?.(adoptedCount, scanned.length, item.matchAddon?.name || item.folderName);
    const result = await adoptScannedAddon(item);
    if (!result.adoptError) adoptedCount++;
    results.push(result);
  }
  return results.filter((r) => r.adoptError);
}

export async function importZip(): Promise<string[]> {
  const folder = await getAddonsFolder();
  if (!folder) throw new Error('Addons folder not configured');

  const selected = await open({
    multiple: false,
    title: 'Select a zip file to import',
    filters: [{ name: 'ZIP Archive', extensions: ['zip'] }],
  });
  if (!selected || typeof selected !== 'string') return [];

  const result = await invoke<string>('import_zip', {
    zipPath: selected,
    targetDir: folder,
  });
  const parsed = JSON.parse(result);
  return parsed.entries as string[];
}

export async function getDefaultDownloadsFolder(): Promise<string | null> {
  try {
    return await invoke<string>('get_downloads_dir');
  } catch {
    return null;
  }
}

export function getWatchFolders(): string[] {
  return loadPrefs().downloadWatchFolders;
}

export function addWatchFolder(path: string): void {
  const prefs = loadPrefs();
  if (!prefs.downloadWatchFolders.includes(path)) {
    savePrefs({ downloadWatchFolders: [...prefs.downloadWatchFolders, path] });
  }
}

export function removeWatchFolder(path: string): void {
  const prefs = loadPrefs();
  savePrefs({ downloadWatchFolders: prefs.downloadWatchFolders.filter((f) => f !== path) });
}

export async function openCurseForgeDownloadPage(slug: string, fileId: number): Promise<void> {
  await openUrl(`https://www.curseforge.com/wow/addons/${slug}/download/${fileId}`);
}

export async function watchForDownload(fileName: string, folders: string[], signal?: AbortSignal): Promise<string | null> {
  const POLL_INTERVAL = 500;
  const MAX_WAIT = 5 * 60 * 1000;
  const STABILIZE_DELAY = 1500;

  const start = Date.now();

  while (!signal?.aborted && Date.now() - start < MAX_WAIT) {
    await new Promise<void>((resolve) => {
      const t = setTimeout(resolve, POLL_INTERVAL);
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            clearTimeout(t);
            resolve();
          },
          { once: true },
        );
      }
    });

    if (signal?.aborted) return null;

    for (const folder of folders) {
      try {
        const fullPath = `${folder.replace(/\\+$/, '').replace(/\/+$/, '')}/${fileName}`;
        if (await exists(fullPath)) {
          await new Promise<void>((resolve) => {
            const t = setTimeout(resolve, STABILIZE_DELAY);
            if (signal) {
              signal.addEventListener(
                'abort',
                () => {
                  clearTimeout(t);
                  resolve();
                },
                { once: true },
              );
            }
          });
          if (signal?.aborted) return null;
          return fullPath;
        }
      } catch {
        // folder may not exist or be unreadable
      }
    }
  }

  return null;
}

export async function installFromZip(
  zipPath: string,
  addon: CF2Addon,
  fileId: number,
  folderName: string,
  version: string | null,
  deleteZip: boolean,
): Promise<string[]> {
  const folder = await getAddonsFolder();
  if (!folder) throw new Error('Addons folder not configured');

  const db = await loadDb();
  if (!db) throw new Error('Could not load database');

  const result = await invoke<string>('import_zip', {
    zipPath,
    targetDir: folder,
  });
  const parsed = JSON.parse(result);
  const entries: string[] =
    parsed.entries && Array.isArray(parsed.entries) && parsed.entries.length > 0 ?
      (parsed.entries as string[])
    : [folderName];

  const existing = db.installed.find((a) => a.modId === addon.id);
  if (existing) {
    const oldFolders = existing.folderNames?.length ? existing.folderNames : [existing.folderName];
    for (const name of oldFolders) {
      const dir = `${folder}/${name}`;
      if (await exists(dir)) {
        await remove(dir, { recursive: true });
      }
    }
    existing.folderName = entries[0];
    existing.folderNames = entries;
    existing.installedFileId = fileId;
    existing.installedVersion = version;
    existing.installedAt = new Date().toISOString();
  } else {
    db.installed.push({
      modId: addon.id,
      name: addon.name,
      slug: addon.slug,
      folderName: entries[0],
      folderNames: entries,
      installedFileId: fileId,
      installedVersion: version,
      installedAt: new Date().toISOString(),
    });
  }

  await saveDb(db);

  if (deleteZip) {
    try {
      await remove(zipPath);
    } catch {
      // best-effort cleanup
    }
  }

  return entries;
}
