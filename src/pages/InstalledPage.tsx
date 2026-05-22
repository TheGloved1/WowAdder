import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { openPath } from "@tauri-apps/plugin-opener";
import {
  getAddonsFolder,
  pickAddonsFolder,
  loadDb,
  getInstalledAddons,
  uninstallAddon,
  scanAddonsFolder,
  matchScannedAddon,
  adoptScannedAddon,
  importZip,
} from "../services/addonManager";
import type { InstalledAddon, ScannedAddon } from "../services/addonManager";

export default function InstalledPage() {
  const navigate = useNavigate();
  const [addonsFolder, setAddonsFolderState] = useState<string | null>(null);
  const [installed, setInstalled] = useState<InstalledAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanned, setScanned] = useState<ScannedAddon[]>([]);
  const [scanning, setScanning] = useState(false);
  const [uninstalling, setUninstalling] = useState<number | null>(null);
  const [matching, setMatching] = useState<Set<string>>(new Set());
  const [adopting, setAdopting] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

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
        setScanned((prev) =>
          prev.map((s) => (s.folderName === folderName ? matched : s)),
        );
      }
    } finally {
      setMatching((prev) => {
        const next = new Set(prev);
        next.delete(folderName);
        return next;
      });
    }
  }

  async function handleAdopt(folderName: string) {
    setAdopting(folderName);
    try {
      const item = scanned.find((s) => s.folderName === folderName);
      if (item && item.matchModId) {
        await adoptScannedAddon(item);
        await refresh();
        setScanned((prev) => prev.filter((s) => s.folderName !== folderName));
      }
    } finally {
      setAdopting(null);
    }
  }

  async function handleImport() {
    setImporting(true);
    try {
      const entries = await importZip();
      if (entries.length > 0) {
        const results = await scanAddonsFolder();
        setScanned(results);
      }
    } catch (err) {
      console.error("Import failed", err);
    } finally {
      setImporting(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (!addonsFolder) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="mb-6">
          <svg
            className="w-16 h-16 text-gray-600 mx-auto mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">
            No Addons Folder Set
          </h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            Select your World of Warcraft AddOns folder to start installing and
            managing addons directly from WowAdder.
          </p>
          <button
            onClick={handlePickFolder}
            className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-500 transition-colors"
          >
            Select AddOns Folder
          </button>
        </div>
        <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg text-left max-w-md mx-auto">
          <p className="text-xs text-gray-400 font-medium mb-1">
            Typical WoW AddOns path:
          </p>
          <code className="text-xs text-gray-500 block">
            <span className="whitespace-nowrap">(Folder with WoW.exe)</span>
            /Interface/AddOns
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Installed Addons</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-gray-500">{addonsFolder}</p>
            <button
              onClick={() => openPath(addonsFolder!)}
              className="text-gray-500 hover:text-white transition-colors"
              title="Open in file manager"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z"
                />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePickFolder}
            className="px-3 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:border-gray-600 transition-colors"
          >
            Change Folder
          </button>
          <button
            onClick={handleScan}
            disabled={scanning}
            className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition-colors flex items-center gap-1.5"
          >
            {scanning ? (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : null}
            {scanning ? "Scanning..." : "Sync"}
          </button>
          <button
            onClick={handleImport}
            disabled={importing}
            className="px-3 py-1.5 text-xs bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 transition-colors"
          >
            {importing ? "Importing..." : "Import ZIP"}
          </button>
        </div>
      </div>

      {scanned.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-medium text-yellow-400 mb-2 flex items-center gap-1.5">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            {scanned.length} external addon{scanned.length !== 1 ? "s" : ""}{" "}
            detected
          </h3>
          <div className="space-y-2">
            {scanned.map((item) => (
              <div
                key={item.folderName}
                className="bg-gray-800/30 border border-yellow-500/20 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">
                    {item.name || item.folderName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {item.folderName}
                    {item.version ? ` v${item.version}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {item.matched && item.matchAddon ? (
                    <>
                      <span className="text-xs text-green-400">
                        {item.matchAddon.name}
                      </span>
                      <button
                        onClick={() => handleAdopt(item.folderName)}
                        disabled={adopting === item.folderName}
                        className="px-2.5 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-500 disabled:opacity-50 transition-colors"
                      >
                        {adopting === item.folderName ? "..." : "Import"}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleMatch(item.folderName)}
                      disabled={matching.has(item.folderName)}
                      className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-500 disabled:opacity-50 transition-colors"
                    >
                      {matching.has(item.folderName) ? "Matching..." : "Match"}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {installed.length === 0 ? (
        <div className="text-center py-20">
          <svg
            className="w-12 h-12 text-gray-600 mx-auto mb-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-gray-400 text-sm font-medium">
            No addons installed
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Browse addons and install them from the addon detail page
          </p>
          <Link
            to="/"
            className="inline-block mt-4 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors"
          >
            Browse Addons
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {installed.map((addon) => (
            <div
              key={addon.modId}
              className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 hover:bg-gray-800 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/addon/${addon.modId}`)}
                    className="text-sm font-medium text-white hover:text-blue-400 transition-colors text-left"
                  >
                    {addon.name}
                  </button>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(addon.folderNames?.length
                      ? addon.folderNames
                      : [addon.folderName]
                    ).map((f) => (
                      <span
                        key={f}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 text-gray-400"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-gray-500">
                      v{addon.installedVersion || "?"}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {new Date(addon.installedAt).toLocaleDateString()}
                    </span>
                    <span className="text-[11px] text-gray-500">
                      {addon.name}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleUninstall(addon.modId)}
                  disabled={uninstalling === addon.modId}
                  className="px-3 py-1.5 text-xs bg-red-600/20 text-red-400 border border-red-600/30 rounded-lg hover:bg-red-600/30 disabled:opacity-50 transition-colors shrink-0"
                >
                  {uninstalling === addon.modId ? "Removing..." : "Uninstall"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
