import { useState, useEffect } from "react";
import { useParams, useSearchParams, useLocation, Link, useNavigate } from "react-router-dom";
import { listen } from "@tauri-apps/api/event";

import type { CF2Addon, CF2File, CF2Pagination } from "../types/curseforge";
import { getMod, getModFiles, getModDescription } from "../services/curseforge";
import {
  getAddonsFolder,
  pickAddonsFolder,
  isAddonInstalled,
  installAddon,
  uninstallAddon,
} from "../services/addonManager";
import WoWPanel from "../components/wow/WoWPanel";
import WoWIconFrame from "../components/wow/WoWIcon";
import WoWBadge from "../components/wow/WoWBadge";
import WoWButton from "../components/wow/WoWButton";
import WoWDivider from "../components/wow/WoWDivider";

function maybeParmajawn() {
  if (Math.random() < 0.02) {
    window.dispatchEvent(new CustomEvent("parmajawn"));
  }
}

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
  const [description, setDescription] = useState<string | null>(null);
  const [descriptionLoading, setDescriptionLoading] = useState(false);

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
        maybeParmajawn();
        setDescriptionLoading(true);
        try {
          const desc = await getModDescription(modId);
          setDescription(desc);
        } catch {
          setDescription(null);
        } finally {
          setDescriptionLoading(false);
        }
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
      maybeParmajawn();
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
          <div className="h-8 bg-wow-panel rounded-sm w-1/3" />
          <div className="h-4 bg-wow-panel rounded-sm w-2/3" />
          <div className="h-64 bg-wow-panel rounded-sm" />
        </div>
      </div>
    );
  }

  if (error || !addon) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-wow-danger text-lg font-wow-heading tracking-wider">{error || "Addon not found"}</p>
        <Link to="/" className="text-wow-gold hover:text-wow-gold/80 mt-2 inline-block font-wow-heading tracking-wide">
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
        className="flex items-center gap-1 text-sm text-wow-text-dim hover:text-wow-gold mb-6 transition-colors font-wow-heading tracking-wide"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back
      </button>

      <WoWPanel className="p-6 mb-8">
        <div className="flex gap-6">
          <WoWIconFrame size="lg">
            {addon.logo?.url ? (
              <img src={addon.logo.url} alt={addon.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-wow-text-muted">
                <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </WoWIconFrame>
          <div className="flex-1">
            <h1 className="text-2xl font-wow-heading tracking-wide text-wow-gold">{addon.name}</h1>
            <p className="text-wow-text-dim mt-1">{addon.summary}</p>
            <div className="flex items-center gap-4 mt-3">
              <span className="text-sm text-wow-text-muted">{downloadCount} downloads</span>
              {addon.gamePopularityRank > 0 && (
                <span className="text-sm text-wow-text-muted">
                  #<span className="text-wow-gold">{addon.gamePopularityRank}</span> popular
                </span>
              )}
              {addon.links?.websiteUrl && (
                <a
                  href={addon.links.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-wow-gold hover:text-wow-gold/80 font-wow-heading tracking-wide"
                >
                  CurseForge Page
                </a>
              )}
              {installedInfo ? (
                <span className="text-xs flex items-center gap-1.5 px-2 py-0.5 rounded-sm bg-wow-quality-purple/10 text-wow-quality-purple border border-wow-quality-purple/30">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Installed v{installedInfo.installedVersion || "?"}
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-3">
              {addon.categories?.map((cat) => (
                <WoWBadge key={cat.id} variant="info">{cat.name}</WoWBadge>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {addon.authors?.map((author) => (
                <span key={author.id} className="text-xs text-wow-text-muted">
                  By {author.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </WoWPanel>

      <WoWPanel className="p-6">
        {installError && (
          <div className="mb-4 flex items-center gap-2 text-sm text-wow-danger bg-wow-danger/10 border border-wow-danger/30 rounded-sm px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            <span>{installError}</span>
            <button onClick={() => setInstallError(null)} className="ml-auto text-wow-danger/60 hover:text-wow-danger">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-wow-heading tracking-wide text-wow-gold">Files</h2>
          {pagination && (
            <p className="text-xs text-wow-text-muted">
              {pagination.totalCount.toLocaleString()} files
              {selectedVersion && !showingAll && " for this version"}
              {showingAll && " (showing all versions)"}
            </p>
          )}
        </div>

        <div className="space-y-2">
          {filesLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-wow-panel border border-wow-border-light rounded-sm p-4 animate-pulse">
                <div className="h-4 bg-wow-panel-hover rounded w-1/3 mb-2" />
                <div className="h-3 bg-wow-panel-hover/70 rounded w-1/2" />
              </div>
            ))
          ) : (
            <>
              {files.map((file) => (
                <div
                  key={file.id}
                  className="bg-wow-bg border border-wow-border-light hover:border-wow-border-gold/50 rounded-sm p-4 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-wow-heading tracking-wide text-wow-text">
                          {file.displayName}
                        </span>
                        {file.releaseType === 1 && (
                          <WoWBadge variant="release">Release</WoWBadge>
                        )}
                        {file.releaseType === 2 && (
                          <WoWBadge variant="beta">Beta</WoWBadge>
                        )}
                        {file.releaseType === 3 && (
                          <WoWBadge variant="alpha">Alpha</WoWBadge>
                        )}
                      </div>
                      {file.gameVersions && file.gameVersions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {file.gameVersions.map((v) => (
                            <span
                              key={v}
                              className={`text-[10px] px-1.5 py-0.5 rounded-sm ${
                                v === selectedVersion
                                  ? "text-wow-gold bg-wow-border-gold/10 border border-wow-border-gold/30"
                                  : "text-wow-text-muted bg-wow-panel"
                              }`}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-wow-text-muted mt-1">
                        {new Date(file.fileDate).toLocaleDateString()} &middot;{" "}
                        {(file.fileLength / 1024).toFixed(0)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {installing ? (
                        <div className="w-32">
                          <div className="h-2 bg-wow-panel rounded-sm overflow-hidden border border-wow-border-gold/30 relative">
                            <div
                              className="absolute inset-0 bg-gradient-to-r from-wow-border-gold to-wow-gold transition-all duration-300"
                              style={{ width: `${installProgress}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-wow-text-muted mt-0.5 block text-right font-wow-heading">
                            {installProgress}%
                          </span>
                        </div>
                      ) : installDone ? (
                        <span className="px-3 py-1.5 text-xs rounded-sm bg-wow-quality-purple/10 text-wow-quality-purple border border-wow-quality-purple/30 cursor-default select-none font-wow-heading tracking-wide">
                          Installed
                        </span>
                      ) : (installedInfo && installedInfo.installedFileId === file.id) ? (
                        <WoWButton variant="danger" onClick={handleUninstall}>
                          Uninstall
                        </WoWButton>
                      ) : (
                        <WoWButton variant="primary" onClick={() => handleInstallFile(file)}>
                          Install
                        </WoWButton>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {files.length === 0 && (
                <p className="text-wow-text-muted text-sm text-center py-8">No files available</p>
              )}
            </>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-1 mt-6 pt-4 border-t border-wow-border-light">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="px-2.5 py-1.5 text-xs bg-wow-panel border border-wow-border-light rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-wow-border-gold transition-colors text-wow-text-dim hover:text-wow-text"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => i).map((p) => (
              <button
                key={p}
                onClick={() => setCurrentPage(p)}
                className={`w-8 h-8 text-xs rounded-sm border transition-colors ${
                  p === currentPage
                    ? "bg-wow-gold text-wow-bg border-wow-gold font-wow-heading"
                    : "bg-wow-panel text-wow-text-dim border-wow-border-light hover:border-wow-border-gold"
                }`}
              >
                {p + 1}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              className="px-2.5 py-1.5 text-xs bg-wow-panel border border-wow-border-light rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-wow-border-gold transition-colors text-wow-text-dim hover:text-wow-text"
            >
              Next
            </button>
          </div>
        )}

        <WoWDivider className="my-6" />

        <h2 className="text-lg font-wow-heading tracking-wide text-wow-gold mb-4">Description</h2>
        {descriptionLoading ? (
          <div className="animate-pulse space-y-2">
            <div className="h-3 bg-wow-panel rounded w-3/4" />
            <div className="h-3 bg-wow-panel rounded w-1/2" />
            <div className="h-3 bg-wow-panel rounded w-5/6" />
          </div>
        ) : description ? (
          <div
            className="prose prose-invert prose-sm max-w-none [&_*]:text-wow-text-dim [&_a]:text-wow-gold [&_a:hover]:text-wow-gold/80 [&_img]:rounded-sm [&_img]:max-w-full [&_h1]:text-lg [&_h1]:font-wow-heading [&_h1]:tracking-wide [&_h1]:text-wow-gold [&_h2]:text-base [&_h2]:font-wow-heading [&_h2]:tracking-wide [&_h2]:text-wow-gold [&_h3]:text-sm [&_h3]:font-medium [&_h3]:text-wow-text [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:text-wow-text-dim [&_p]:text-wow-text-dim [&_blockquote]:border-l-4 [&_blockquote]:border-wow-border-gold/40 [&_blockquote]:pl-4 [&_blockquote]:text-wow-text-muted [&_pre]:bg-wow-panel [&_pre]:rounded-sm [&_pre]:p-4 [&_pre]:overflow-x-auto [&_pre]:border [&_pre]:border-wow-border-light [&_code]:text-xs [&_code]:bg-wow-panel [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-sm [&_table]:w-full [&_th]:text-left [&_th]:text-wow-text [&_th]:font-wow-heading [&_th]:px-3 [&_th]:py-2 [&_td]:px-3 [&_td]:py-2 [&_td]:text-wow-text-dim [&_tr]:border-b [&_tr]:border-wow-border-light]"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        ) : (
          <p className="text-sm text-wow-text-muted">No description available.</p>
        )}
      </WoWPanel>
    </div>
  );
}
