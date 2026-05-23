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
  matchAllScannedAddons,
  adoptScannedAddon,
  adoptAllScannedAddons,
  importZip,
} from "../services/addonManager";
import type { InstalledAddon, ScannedAddon } from "../services/addonManager";
import WoWPanel from "../components/wow/WoWPanel";
import WoWButton from "../components/wow/WoWButton";

export default function InstalledPage() {
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
  const [batchProgress, setBatchProgress] = useState<string | null>(null);

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
          setScanned((prev) =>
            prev.map((s) => (s.folderName === folderName ? result : s)),
          );
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
          prev.map((s) => {
            const f = failed.find((x) => x.folderName === s.folderName);
            return f || (s.matched && s.matchModId ? { ...s, adoptError: undefined } : s);
          }).filter((s) => !(s.matched && s.matchModId && !s.adoptError)),
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
      console.error("Import failed", err);
    } finally {
      setImporting(false);
    }
  }

  const unmatchedCount = scanned.filter((s) => !s.matched).length;
  const matchableCount = scanned.filter((s) => s.matched && s.matchModId && !s.adoptError).length;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-wow-panel rounded-sm w-1/3" />
          <div className="h-64 bg-wow-panel rounded-sm" />
        </div>
      </div>
    );
  }

  if (!addonsFolder) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 mx-auto mb-4 rounded-sm border border-wow-border-gold/30 bg-wow-panel flex items-center justify-center">
            <svg
              className="w-8 h-8 text-wow-gold"
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
          </div>
          <h2 className="text-xl font-wow-heading tracking-wide text-wow-gold mb-2">
            No Addons Folder Set
          </h2>
          <p className="text-wow-text-dim mb-6 max-w-md mx-auto">
            Select your World of Warcraft AddOns folder to start installing and
            managing addons directly from WowAdder.
          </p>
          <WoWButton variant="primary" size="md" onClick={handlePickFolder}>
            Select AddOns Folder
          </WoWButton>
        </div>
        <div className="mt-8 p-4 bg-wow-panel border border-wow-border-light rounded-sm text-left max-w-md mx-auto">
          <p className="text-xs text-wow-text-muted font-wow-heading tracking-wide mb-1 uppercase">
            Typical WoW AddOns path:
          </p>
          <code className="text-xs text-wow-text-dim block">
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
          <h1 className="text-xl font-wow-heading tracking-wide text-wow-gold">Installed Addons</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-wow-text-muted">{addonsFolder}</p>
            <button
              onClick={() => openPath(addonsFolder!)}
              className="text-wow-text-muted hover:text-wow-gold transition-colors"
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
          <WoWButton variant="ghost" size="sm" onClick={handlePickFolder}>
            Change Folder
          </WoWButton>
          <WoWButton
            variant="primary"
            size="sm"
            onClick={handleScan}
            disabled={scanning}
          >
            {scanning ? (
              <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {scanning ? "Scanning..." : "Sync"}
          </WoWButton>
          <WoWButton
            variant="default"
            size="sm"
            onClick={handleImport}
            disabled={importing}
          >
            {importing ? "Importing..." : "Import ZIP"}
          </WoWButton>
        </div>
      </div>

      {scanned.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-wow-heading tracking-wide text-wow-quality-orange flex items-center gap-1.5">
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
              {scanned.length} external addon{scanned.length !== 1 ? "s" : ""} detected
            </h3>
            <div className="flex items-center gap-2">
              {unmatchedCount > 0 && (
                <WoWButton
                  variant="default"
                  size="sm"
                  onClick={handleMatchAll}
                  disabled={batchMatching}
                >
                  {batchMatching ? "Matching..." : `Match All (${unmatchedCount})`}
                </WoWButton>
              )}
              {matchableCount > 0 && (
                <WoWButton
                  variant="primary"
                  size="sm"
                  onClick={handleAdoptAll}
                  disabled={batchAdopting}
                >
                  {batchAdopting ? "Importing..." : `Import All (${matchableCount})`}
                </WoWButton>
              )}
            </div>
          </div>

          {batchProgress && (
            <div className="mb-3 flex items-center gap-2 text-xs text-wow-gold bg-wow-border-gold/10 border border-wow-border-gold/30 rounded-sm px-3 py-2">
              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {batchProgress}
            </div>
          )}

          <div className="space-y-2">
            {scanned.map((item) => (
              <div
                key={item.folderName}
                className="bg-wow-bg border border-wow-quality-orange/30 rounded-sm p-3 flex items-center justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-wow-text truncate">
                    {item.name || item.folderName}
                  </p>
                  <p className="text-xs text-wow-text-muted">
                    {item.folderName}
                    {item.version ? ` v${item.version}` : ""}
                  </p>
                  {item.matchError && (
                    <p className="text-[10px] text-wow-quality-orange mt-0.5">
                      {item.matchError}
                    </p>
                  )}
                  {item.adoptError && (
                    <p className="text-[10px] text-wow-danger mt-0.5">
                      {item.adoptError}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {item.adoptError ? (
                    <WoWButton
                      variant="danger"
                      size="sm"
                      onClick={() => handleMatch(item.folderName)}
                      disabled={matching.has(item.folderName)}
                    >
                      {matching.has(item.folderName) ? "..." : "Retry"}
                    </WoWButton>
                  ) : item.matched && item.matchAddon ? (
                    <>
                      <span className="text-xs text-wow-quality-green font-wow-heading tracking-wide">
                        {item.matchAddon.name}
                      </span>
                      <WoWButton
                        variant="primary"
                        size="sm"
                        onClick={() => handleAdopt(item.folderName)}
                        disabled={adopting === item.folderName || batchAdopting}
                      >
                        {adopting === item.folderName ? "..." : "Import"}
                      </WoWButton>
                    </>
                  ) : (
                    <WoWButton
                      variant="default"
                      size="sm"
                      onClick={() => handleMatch(item.folderName)}
                      disabled={matching.has(item.folderName) || batchMatching}
                    >
                      {matching.has(item.folderName) ? "Matching..." : "Match"}
                    </WoWButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {installed.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-12 h-12 mx-auto mb-3 rounded-sm border border-wow-border-gold/30 bg-wow-panel flex items-center justify-center">
            <svg
              className="w-6 h-6 text-wow-gold"
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
          </div>
          <p className="text-wow-text-dim text-sm font-wow-heading tracking-wider">
            No addons installed
          </p>
          <p className="text-wow-text-muted text-xs mt-1">
            Browse addons and install them from the addon detail page
          </p>
          <Link
            to="/"
            className="inline-block mt-4 px-4 py-2 text-sm font-wow-heading tracking-wide bg-wow-gold text-wow-bg rounded-sm hover:bg-wow-gold/90 transition-colors"
          >
            Browse Addons
          </Link>
        </div>
      ) : (
        <WoWPanel className="divide-y divide-wow-border-light">
          {installed.map((addon) => (
            <div
              key={addon.modId}
              className="p-4 hover:bg-wow-panel-hover/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => navigate(`/addon/${addon.modId}`)}
                    className="text-sm font-wow-heading tracking-wide text-wow-text hover:text-wow-gold transition-colors text-left"
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
                        className="text-[10px] px-1.5 py-0.5 rounded-sm bg-wow-panel text-wow-text-muted"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[11px] text-wow-text-muted">
                      v{addon.installedVersion || "?"}
                    </span>
                    <span className="text-[11px] text-wow-text-muted">
                      {new Date(addon.installedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <WoWButton
                  variant="danger"
                  size="sm"
                  onClick={() => handleUninstall(addon.modId)}
                  disabled={uninstalling === addon.modId}
                >
                  {uninstalling === addon.modId ? "Removing..." : "Uninstall"}
                </WoWButton>
              </div>
            </div>
          ))}
        </WoWPanel>
      )}
    </div>
  );
}