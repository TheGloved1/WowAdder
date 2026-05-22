import { open } from "@tauri-apps/plugin-dialog";
import {
  readTextFile,
  writeTextFile,
  readDir,
  remove,
  exists,
  mkdir,
} from "@tauri-apps/plugin-fs";
import { invoke } from "@tauri-apps/api/core";
import { load } from "@tauri-apps/plugin-store";
import type { CF2Addon } from "../types/curseforge";
import { getMod, searchMods, getModFileDownloadUrl } from "./curseforge";

const STORE_FILE = "wowadder-config.json";

let storePromise: ReturnType<typeof load> | null = null;
function getStore() {
  if (!storePromise) {
    storePromise = load(STORE_FILE, { defaults: {}, autoSave: true });
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

const DB_FILENAME = ".wowadder/db.json";

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
  let stored = await store.get<string>("addonsFolder");
  if (!stored) {
    const legacy = localStorage.getItem("wowadder_addons_folder");
    if (legacy) {
      await store.set("addonsFolder", legacy);
      localStorage.removeItem("wowadder_addons_folder");
      stored = legacy;
    }
  }
  if (stored) cachedFolder = stored;
  return stored ?? null;
}

export async function setAddonsFolder(path: string): Promise<void> {
  const store = await getStore();
  await store.set("addonsFolder", path);
  cachedFolder = path;
  cachedDb = null;
  cachedInstallMap = null;
}

export async function pickAddonsFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: "Select your WoW AddOns folder",
  });
  if (selected && typeof selected === "string") {
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
    await writeTextFile(
      path,
      JSON.stringify(getDefaultDb(addonsFolder), null, 2),
    );
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
  console.log("[DEBUG installAddon] Starting install:", { addonId: addon.id, fileId, folderName, version, fileDownloadUrl, fileName, hasDownloadUrl: !!fileDownloadUrl });

  const folder = await getAddonsFolder();
  console.log("[DEBUG installAddon] getAddonsFolder:", folder);
  if (!folder) throw new Error("Addons folder not configured");

  const db = await loadDb();
  console.log("[DEBUG installAddon] loadDb result:", db ? { addonsFolder: db.addonsFolder, installedCount: db.installed.length } : null);
  if (!db) throw new Error("Could not load database");

  const existing = db.installed.find((a) => a.modId === addon.id);
  console.log("[DEBUG installAddon] existing entry:", existing);
  if (existing) {
    console.log("[DEBUG installAddon] Upgrading existing installation:", existing);
    // Install new version first, then remove old folders (safe rollback)
  }

  let downloadUrl: string | undefined | null = fileDownloadUrl;
  if (!downloadUrl) {
    console.log("[DEBUG installAddon] No fileDownloadUrl, trying CDN construct with fileName:", fileName);
    if (fileName) {
      const chunk1 = Math.floor(fileId / 1000);
      const chunk2 = fileId % 1000;
      downloadUrl = `https://edge.forgecdn.net/files/${chunk1}/${chunk2}/${fileName}`;
      console.log("[DEBUG installAddon] Constructed CDN URL:", downloadUrl);
    }
  }
  if (!downloadUrl) {
    console.log("[DEBUG installAddon] CDN construct failed, calling getModFileDownloadUrl API...");
    try {
      downloadUrl = await getModFileDownloadUrl(addon.id, fileId);
      console.log("[DEBUG installAddon] getModFileDownloadUrl returned:", downloadUrl);
    } catch (apiErr) {
      console.log("[DEBUG installAddon] getModFileDownloadUrl threw:", apiErr);
    }
  }
  if (!downloadUrl) {
    throw new Error(`Could not get download URL for file ${fileId} (addon ${addon.id}).`);
  }
  console.log("[DEBUG installAddon] Using downloadUrl:", downloadUrl);

  let entries: string[] = [folderName];
  console.log("[DEBUG installAddon] Calling invoke('install_addon')...");
  try {
    const result = await invoke<string>("install_addon", {
      downloadUrl,
      targetDir: folder,
      folderName,
    });
    console.log("[DEBUG installAddon] install_addon invoke succeeded, result:", result);
    const parsed = JSON.parse(result);
    if (parsed.entries && Array.isArray(parsed.entries) && parsed.entries.length > 0) {
      entries = parsed.entries;
    }
  } catch (invokeErr) {
    console.log("[DEBUG installAddon] install_addon invoke FAILED:", invokeErr);
    if (invokeErr instanceof Error) {
      console.log("[DEBUG installAddon] invoke error message:", invokeErr.message);
      console.log("[DEBUG installAddon] invoke error stack:", invokeErr.stack);
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
    console.log("[DEBUG installAddon] Updated existing entry");
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
    console.log("[DEBUG installAddon] Pushed new entry");
  }

  await saveDb(db);
  console.log("[DEBUG installAddon] saveDb complete");
}

export async function uninstallAddon(modId: number): Promise<void> {
  const db = await loadDb();
  if (!db) throw new Error("Could not load database");

  const entry = db.installed.find((a) => a.modId === modId);
  if (!entry) throw new Error("Addon not found in database");

  const folderNames = entry.folderNames?.length ? entry.folderNames : [entry.folderName];
  for (const name of folderNames) {
    const addonPath = `${db.addonsFolder}/${name}`;
    const pathExists = await exists(addonPath);
    if (pathExists) {
      console.log("[DEBUG uninstallAddon] Removing:", addonPath);
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
}

export async function scanAddonsFolder(): Promise<ScannedAddon[]> {
  const folder = await getAddonsFolder();
  if (!folder) return [];

  const entries = await readDir(folder);
  const results: ScannedAddon[] = [];
  const db = await loadDb();

  for (const entry of entries) {
    if (!entry.name || !entry.isDirectory) continue;
    if (entry.name.startsWith(".")) continue;
    if (entry.name === ".." || entry.name === ".") continue;

    const alreadyInstalled = db?.installed.find(
      (a) => a.folderName === entry.name,
    );
    if (alreadyInstalled) continue;

    let name: string | null = null;
    let version: string | null = null;

    try {
      const dirEntries = await readDir(`${folder}/${entry.name}`);
      for (const file of dirEntries) {
        if (file.name && file.name.endsWith(".toc") && !file.isDirectory) {
          const content = await readTextFile(
            `${folder}/${entry.name}/${file.name}`,
          );
          for (const line of content.split("\n")) {
            const trimmed = line.trim();
            if (trimmed.startsWith("## Title: ")) {
              name = trimmed.slice(10).trim();
            } else if (trimmed.startsWith("## Version: ")) {
              version = trimmed.slice(12).trim();
            }
          }
        }
      }
    } catch {
      // skip unreadable folders
    }

    results.push({
      folderName: entry.name,
      name,
      version,
      matched: false,
    });
  }

  return results;
}

export async function matchScannedAddon(
  scanned: ScannedAddon,
): Promise<ScannedAddon> {
  if (scanned.matched) return scanned;

  try {
    const searchName = scanned.name || scanned.folderName;
    const result = await searchMods({ searchFilter: searchName, pageSize: 5 });

    for (const addon of result.addons) {
      if (addon.name.toLowerCase() === searchName.toLowerCase()) {
        return {
          ...scanned,
          matched: true,
          matchModId: addon.id,
          matchAddon: addon,
        };
      }
    }

    if (result.addons.length > 0) {
      return {
        ...scanned,
        matched: true,
        matchModId: result.addons[0].id,
        matchAddon: result.addons[0],
      };
    }
  } catch {
    // matching failed
  }

  return scanned;
}

export async function adoptScannedAddon(scanned: ScannedAddon): Promise<void> {
  if (!scanned.matchModId)
    throw new Error("Cannot adopt addon without a match");

  const folder = await getAddonsFolder();
  if (!folder) throw new Error("Addons folder not configured");

  const db = await loadDb();
  if (!db) throw new Error("Could not load database");

  const addon = scanned.matchAddon || (await getMod(scanned.matchModId));
  if (!addon) throw new Error("Could not load addon data");

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
}

export async function importZip(): Promise<string[]> {
  const folder = await getAddonsFolder();
  if (!folder) throw new Error("Addons folder not configured");

  const selected = await open({
    multiple: false,
    title: "Select a zip file to import",
    filters: [{ name: "ZIP Archive", extensions: ["zip"] }],
  });
  if (!selected || typeof selected !== "string") return [];

  const result = await invoke<string>("import_zip", {
    zipPath: selected,
    targetDir: folder,
  });
  const parsed = JSON.parse(result);
  return parsed.entries as string[];
}
