import { useState, useEffect } from "react";
import { useParams, useSearchParams, useLocation, Link, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";

import type { CF2Addon, CF2File, CF2Pagination } from "../types/curseforge";
import { getMod, getModFiles } from "../services/curseforge";
import {
  getAddonsFolder,
  pickAddonsFolder,
  isAddonInstalled,
  installAddon,
  uninstallAddon,
} from "../services/addonManager";

const PAGE_SIZE = 10;

export default function AddonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const selectedVersion = searchParams.get("version") || "";
  const location = useLocation();
  const backParams = location.state?.searchParams as Record<string, string> | undefined;
  const handleBack = () => {
    if (backParams) {
      const sp = new URLSearchParams(backParams as any);
      navigate({ pathname: "/", search: sp.toString() });
    } else {
      navigate(-1);
    }
  };
  const [addon, setAddon] = useState<CF2Addon | null>(null);
  const [files, setFiles] = useState<CF2File[]>([]);
  const [pagination, setPagination] = useState<CF2Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installedInfo, setInstalledInfo] = useState<ReturnType<typeof isAddonInstalled>>(undefined);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(0);
  const [installError, setInstallError] = useState<string | null>(null);
  const [installDone, setInstallDone] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [showingAll, setShowingAll] = useState(false);

  useEffect(() => {
    if (!id) return;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const modId = Number(id);
        const modData = await getMod(modId);
        if (!modData) {
          setError("Addon not found");
          return;
        }
        setAddon(modData);
        setFiles(modData.latestFiles ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load addon details"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  useEffect(() => {
    if (!addon) return;
    const info = isAddonInstalled(addon.id);
    setInstalledInfo(info);
  }, [addon]);

  useEffect(() => {
    if (!installing) return;
    const unlisten = listen<number>("install-progress", (event) => {
      setInstallProgress(event.payload);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [installing]);

  useEffect(() => {
    if (!addon || !id) return;
    async function loadFiles() {
      setFilesLoading(true);
      try {
        const result = await getModFiles(Number(id), {
          gameVersion: selectedVersion || undefined,
          gameVersionTypeId: 517,
          index: currentPage * PAGE_SIZE,
          pageSize: PAGE_SIZE,
        });
        if (result.files.length > 0) {
          setFiles(result.files);
          setPagination(result.pagination ?? null);
          setShowingAll(false);
        } else if (!showingAll) {
          const allResult = await getModFiles(Number(id), {
            index: currentPage * PAGE_SIZE,
            pageSize: PAGE_SIZE,
          });
          setFiles(allResult.files.length > 0 ? allResult.files : (addon?.latestFiles ?? []));
          setPagination(allResult.pagination ?? null);
          setShowingAll(true);
        }
      } catch {
        setFiles(addon?.latestFiles ?? []);
        setPagination(null);
      } finally {
        setFilesLoading(false);
      }
    }
    loadFiles();
  }, [addon, id, selectedVersion, currentPage]);

  async function handleInstallFile(file: CF2File) {
    if (!addon) {
      console.log("[DEBUG] handleInstallFile: no addon loaded, returning early");
      return;
    }
    console.log("[DEBUG] handleInstallFile called", {
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
    setInstallDone(false);
    setInstalling(true);
    try {
      console.log("[DEBUG] Checking addons folder...");
      let folder = await getAddonsFolder();
      console.log("[DEBUG] getAddonsFolder returned:", folder);
      if (!folder) {
        console.log("[DEBUG] No folder set, opening picker...");
        folder = await pickAddonsFolder();
        console.log("[DEBUG] pickAddonsFolder returned:", folder);
        if (!folder) {
          console.log("[DEBUG] User cancelled folder picker");
          setInstallError("No AddOns folder selected");
          return;
        }
      }
      console.log("[DEBUG] Calling installAddon with:", {
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
      console.log("[DEBUG] installAddon completed successfully");
      setInstallDone(true);
      setInstalledInfo(isAddonInstalled(addon.id));
    } catch (err) {
      console.log("[DEBUG] installAddon threw an error:", err);
      const msg = err instanceof Error ? err.message : "Install failed";
      console.log("[DEBUG] Error message:", msg);
      if (err instanceof Error && err.stack) {
        console.log("[DEBUG] Error stack:", err.stack);
      }
      setInstallError(msg);
    } finally {
      console.log("[DEBUG] handleInstallFile finally block, setting installing=false");
      setInstalling(false);
    }
  }

  async function handleUninstall() {
    if (!addon) return;
    setInstalling(true);
    try {
      await uninstallAddon(addon.id);
      setInstalledInfo(undefined);
    } catch (err) {
      console.error("Uninstall failed", err);
    } finally {
      setInstalling(false);
    }
  }

  const totalPages = pagination
    ? Math.ceil(pagination.totalCount / pagination.pageSize)
    : 0;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-800 rounded w-1/3" />
          <div className="h-4 bg-gray-800 rounded w-2/3" />
          <div className="h-64 bg-gray-800 rounded" />
        </div>
      </div>
    );
  }

  if (error || !addon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-red-400 text-lg font-medium">{error || "Addon not found"}</p>
        <Link to="/" className="text-blue-400 hover:text-blue-300 mt-2 inline-block">
          Back to browse
        </Link>
      </div>
    );
  }

  const downloadCount = addon.downloadCount.toLocaleString();

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
        <button
          onClick={handleBack}
          className="flex items-center gap-1 text-sm text-gray-400 hover:text-white mb-6 transition-colors"
        >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <div className="flex gap-6 mb-8">
        <div className="w-24 h-24 shrink-0 rounded-xl overflow-hidden bg-gray-800">
          {addon.logo?.url ? (
            <img src={addon.logo.url} alt={addon.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-600">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-white">{addon.name}</h1>
          <p className="text-gray-400 mt-1">{addon.summary}</p>
          <div className="flex items-center gap-3 mt-3">
            <span className="text-sm text-gray-500">{downloadCount} downloads</span>
            {addon.gamePopularityRank > 0 && (
              <span className="text-sm text-gray-500">
                #{addon.gamePopularityRank} popular
              </span>
            )}
            {addon.links?.websiteUrl && (
              <a
                href={addon.links.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                CurseForge Page
              </a>
            )}
            {installedInfo ? (
              <span className="text-xs flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Installed v{installedInfo.installedVersion || "?"}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-3">
            {addon.categories?.map((cat) => (
              <span
                key={cat.id}
                className="text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 border border-gray-700"
              >
                {cat.name}
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {addon.authors?.map((author) => (
              <span key={author.id} className="text-xs text-gray-500">
                By {author.name}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-gray-800 pt-6">

        {installError && (
          <div className="mb-4 flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{installError}</span>
            <button onClick={() => setInstallError(null)} className="ml-auto text-red-400/60 hover:text-red-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Files</h2>
          {pagination && (
            <p className="text-xs text-gray-500">
              {pagination.totalCount.toLocaleString()} files
              {selectedVersion && !showingAll && " for this version"}
              {showingAll && " (showing all versions)"}
            </p>
          )}
        </div>
        <div className="space-y-2">
          {filesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-4 animate-pulse">
                <div className="h-4 bg-gray-700/50 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-700/30 rounded w-1/2" />
              </div>
            ))
          ) : (
            <>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 rounded-lg p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {file.displayName}
                        </span>
                        {file.releaseType === 1 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                            Release
                          </span>
                        )}
                        {file.releaseType === 2 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-500/10 text-yellow-400">
                            Beta
                          </span>
                        )}
                        {file.releaseType === 3 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400">
                            Alpha
                          </span>
                        )}
                      </div>
                      {file.gameVersions && file.gameVersions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {file.gameVersions.map((v) => (
                            <span
                              key={v}
                              className={`text-[10px] px-1.5 py-0.5 rounded bg-gray-700/50 ${
                                v === selectedVersion
                                  ? "text-blue-300 border border-blue-500/30"
                                  : "text-gray-400"
                              }`}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(file.fileDate).toLocaleDateString()} &middot;{" "}
                        {(file.fileLength / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {installing ? (
                        <div className="w-32">
                          <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all duration-300"
                              style={{ width: `${installProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-400 mt-0.5 block text-right">{installProgress}%</span>
                        </div>
                      ) : installDone ? (
                        <span className="px-3 py-1.5 text-xs rounded-lg bg-gray-600/30 text-gray-400 border border-gray-600/30 cursor-default select-none">
                          Installed ✓
                        </span>
                      ) : installedInfo ? (
                        <button
                          onClick={handleUninstall}
                          className="px-3 py-1.5 text-xs rounded-lg bg-red-600/20 text-red-400 border border-red-600/30 hover:bg-red-600/30 transition-colors"
                        >
                          Uninstall
                        </button>
                      ) : (
                        <button
                          onClick={() => handleInstallFile(file)}
                          className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white border border-blue-500 hover:bg-blue-500 transition-colors"
                        >
                          Install to AddOns
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-gray-500 text-sm text-center py-8">
                  No files available
                </p>
              )}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-6">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-600 transition-colors"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 text-xs rounded-lg border transition-colors ${
                  p === currentPage
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-gray-800 text-gray-300 border-gray-700 hover:border-gray-600"
                }`}
              >
                {p + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-2.5 py-1.5 text-xs bg-gray-800 border border-gray-700 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-gray-600 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
