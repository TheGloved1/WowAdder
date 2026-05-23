import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import VersionSelector from "../components/VersionSelector";
import SearchBar from "../components/SearchBar";
import CategorySidebar from "../components/CategorySidebar";
import AddonGrid from "../components/AddonGrid";
import SortSelector from "../components/SortSelector";
import type { SortOption } from "../components/SortSelector";
import WoWPanel from "../components/wow/WoWPanel";
import WoWDivider from "../components/wow/WoWDivider";
import {
  getGameVersions,
  searchMods,
  getCategories,
  getClientStatus,
} from "../services/curseforge";
import { loadPrefs, savePrefs } from "../services/preferences";
import type { CF2Addon, CF2Pagination } from "../types/curseforge";

function sortVersionsDesc(versions: string[]): string[] {
  return [...versions].sort((a, b) => {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const va = pa[i] ?? 0;
      const vb = pb[i] ?? 0;
      if (va !== vb) return vb - va;
    }
    return 0;
  });
}

export default function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefs = loadPrefs();

  const [versions, setVersions] = useState<string[]>([]);
  const [versionsLoading, setVersionsLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState(
    searchParams.get("version") || prefs.version
  );
  const [selectedVersionTypeId] = useState<number | undefined>(517);

  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("q") || ""
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState(
    Number(searchParams.get("categoryId")) || 0
  );
  const [sortOption, setSortOption] = useState<SortOption>(
    prefs.sortOption
  );

  const [addons, setAddons] = useState<CF2Addon[]>([]);
  const [pagination, setPagination] = useState<CF2Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(
    Math.max(0, (Number(searchParams.get("page")) || 1) - 1)
  );
  const [editingPage, setEditingPage] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);
  const [pageSize, setPageSize] = useState(
    Number(searchParams.get("pageSize")) || prefs.pageSize
  );

  const categories = getCategories();
  const clientStatus = getClientStatus();

  useEffect(() => {
    async function loadVersions() {
      try {
        const versionData = await getGameVersions(1);
        const allVersions = sortVersionsDesc(
          versionData.flatMap((vt) => vt.versions)
        );
        setVersions(allVersions);
        if (!selectedVersion && allVersions.length > 0) {
          setSelectedVersion(allVersions[0]);
        }
      } catch {
        setVersions([]);
      } finally {
        setVersionsLoading(false);
      }
    }
    loadVersions();
  }, []);

  const fetchAddons = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      try {
        const result = await searchMods({
          gameVersion: selectedVersion || undefined,
          gameVersionTypeId: selectedVersionTypeId,
          searchFilter: searchQuery || undefined,
          categoryId: selectedCategoryId > 0 ? selectedCategoryId : undefined,
          sortField: String(sortOption.field),
          sortOrder: sortOption.order,
          index: page * pageSize,
          pageSize,
        });
        setAddons(result.addons);
        setPagination(result.pagination ?? null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setAddons([]);
        setPagination(null);
      } finally {
        setLoading(false);
      }
    },
    [
      selectedVersion,
      selectedVersionTypeId,
      searchQuery,
      selectedCategoryId,
      sortOption,
      pageSize,
    ]
  );

  useEffect(() => {
    fetchAddons(currentPage);
  }, [fetchAddons]);

  function handleSearch() {
    setCurrentPage(0);
    syncUrl(selectedVersion, searchQuery, selectedCategoryId, sortOption.field, sortOption.order, pageSize, 0);
    fetchAddons(0);
  }

  function syncUrl(
    v: string, q: string, cat: number,
    sf: number, so: string, ps: number, page: number
  ) {
    const params = new URLSearchParams();
    if (v) params.set("version", v);
    if (q) params.set("q", q);
    if (cat) params.set("categoryId", String(cat));
    params.set("sortField", String(sf));
    params.set("sortOrder", so);
    if (ps !== 20) params.set("pageSize", String(ps));
    if (page > 0) params.set("page", String(page + 1));
    setSearchParams(params, { replace: false });
  }

  function handleVersionChange(version: string) {
    setSelectedVersion(version);
    setCurrentPage(0);
    syncUrl(version, searchQuery, selectedCategoryId, sortOption.field, sortOption.order, pageSize, 0);
    savePrefs({ version });
  }

  function handleCategoryChange(id: number) {
    setSelectedCategoryId(id);
    setCurrentPage(0);
    syncUrl(selectedVersion, searchQuery, id, sortOption.field, sortOption.order, pageSize, 0);
  }

  function handleSortChange(option: SortOption) {
    setSortOption(option);
    setCurrentPage(0);
    syncUrl(selectedVersion, searchQuery, selectedCategoryId, option.field, option.order, pageSize, 0);
    savePrefs({ sortOption: option });
  }

  function handleAddonClick(id: number) {
    const params = new URLSearchParams();
    if (selectedVersion) params.set("version", selectedVersion);
    if (searchQuery) params.set("q", searchQuery);
    if (selectedCategoryId) params.set("categoryId", String(selectedCategoryId));
    params.set("sortField", String(sortOption.field));
    params.set("sortOrder", sortOption.order);
    if (pageSize !== 20) params.set("pageSize", String(pageSize));
    if (currentPage > 0) params.set("page", String(currentPage + 1));
    const versionParam = selectedVersion ? `?version=${encodeURIComponent(selectedVersion)}` : "";
    navigate(`/addon/${id}${versionParam}`, {
      state: { searchParams: Object.fromEntries(params) },
    });
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    syncUrl(selectedVersion, searchQuery, selectedCategoryId, sortOption.field, sortOption.order, pageSize, newPage);
    fetchAddons(newPage);
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(0);
    syncUrl(selectedVersion, searchQuery, selectedCategoryId, sortOption.field, sortOption.order, size, 0);
    savePrefs({ pageSize: size });
  }

  function handleEditSubmit() {
    const input = editInputRef.current;
    if (!input) return;
    const page = Number(input.value);
    if (!isNaN(page) && page >= 1 && page <= totalPages) {
      handlePageChange(page - 1);
    }
    setEditingPage(false);
  }

  function handleCurrentPageClick() {
    setEditingPage(true);
    setTimeout(() => {
      editInputRef.current?.focus();
      editInputRef.current?.select();
    }, 0);
  }

  const totalPages = pagination
    ? Math.ceil(pagination.totalCount / pagination.pageSize)
    : 0;

  function getPageNumbers(): (number | "ellipsis")[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }
    const pages: (number | "ellipsis")[] = [0];
    if (currentPage > 3) pages.push("ellipsis");
    for (
      let i = Math.max(1, currentPage - 1);
      i <= Math.min(totalPages - 2, currentPage + 1);
      i++
    ) {
      pages.push(i);
    }
    if (currentPage < totalPages - 4) pages.push("ellipsis");
    pages.push(totalPages - 1);
    return pages;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {!clientStatus.configured && (
        <div className="mb-4 p-3 bg-wow-danger/10 border border-wow-danger/30 rounded-sm flex items-center gap-3">
          <svg className="w-5 h-5 text-wow-danger shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-wow-text-dim text-sm">
            <span className="text-wow-gold font-wow-heading">CurseForge API key</span> not configured. Set{" "}
            <code className="text-wow-gold bg-wow-border-gold/10 px-1 rounded-sm">
              VITE_CURSEFORGE_API_KEY
            </code>{" "}
            in your <code className="text-wow-gold bg-wow-border-gold/10 px-1 rounded-sm">.env</code> file.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3 mb-6">
        <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />
        <VersionSelector
          versions={versions}
          selectedVersion={selectedVersion}
          onVersionChange={handleVersionChange}
          loading={versionsLoading}
        />
      </div>

      <div className="flex gap-6">
        <CategorySidebar
          categories={categories}
          selectedCategoryId={selectedCategoryId}
          onCategoryChange={handleCategoryChange}
        />
        <div className="flex-1 min-w-0">
          <WoWPanel className="p-4">
            <div className="flex items-center justify-between mb-3">
              {pagination ? (
                <p className="text-sm text-wow-text-dim">
                  <span className="text-wow-gold font-wow-heading">{pagination.totalCount.toLocaleString()}</span> results
                </p>
              ) : (
                <div />
              )}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <label className="text-xs text-wow-text-muted font-wow-heading tracking-wider uppercase">Per page:</label>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                    className="appearance-none bg-wow-panel border border-wow-border-light rounded-sm px-2 py-1.5 text-xs text-wow-text-dim focus:outline-none focus:border-wow-border-gold cursor-pointer hover:border-wow-border-gold/50 transition-colors"
                  >
                    {[10, 20, 50].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <SortSelector value={sortOption} onChange={handleSortChange} />
              </div>
            </div>

            <WoWDivider className="mb-4" />

            <AddonGrid
              addons={addons}
              onAddonClick={handleAddonClick}
              loading={loading}
              error={error}
            />

            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-1 mt-6 pt-4 border-t border-wow-border-light">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 0}
                  className="px-2.5 py-1.5 text-xs bg-wow-panel border border-wow-border-light rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-wow-border-gold transition-colors text-wow-text-dim hover:text-wow-text"
                >
                  Prev
                </button>
                {(() => {
                  const pages = getPageNumbers();
                  const items: React.JSX.Element[] = [];
                  let jumpShown = false;
                  for (let i = 0; i < pages.length; i++) {
                    const p = pages[i];
                    if (p === "ellipsis" && !jumpShown) {
                      jumpShown = true;
                      items.push(<span key={`ellipsis-${i}`} className="px-1 text-wow-text-muted text-xs">...</span>);
                    } else if (p === "ellipsis") {
                      items.push(<span key={`ellipsis2-${i}`} className="px-1 text-wow-text-muted text-xs">...</span>);
                    } else if (p === currentPage && editingPage) {
                      items.push(
                        <input
                          key={`edit-${p}`}
                          ref={editInputRef}
                          type="number"
                          min={1}
                          max={totalPages}
                          defaultValue={p + 1}
                          onKeyDown={(e) => { if (e.key === "Enter") handleEditSubmit(); if (e.key === "Escape") setEditingPage(false); }}
                          onBlur={handleEditSubmit}
                          className="w-10 h-8 text-xs text-center bg-wow-panel border border-wow-border-gold rounded-sm text-wow-text focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      );
                    } else {
                      items.push(
                        p === currentPage ? (
                          <button
                            key={p}
                            onClick={handleCurrentPageClick}
                            className="w-8 h-8 text-xs rounded-sm border border-wow-gold bg-wow-gold text-wow-bg font-wow-heading transition-colors cursor-pointer"
                          >
                            {p + 1}
                          </button>
                        ) : (
                          <button
                            key={p}
                            onClick={() => handlePageChange(p)}
                            className="w-8 h-8 text-xs rounded-sm border border-wow-border-light bg-wow-panel text-wow-text-dim hover:border-wow-border-gold hover:text-wow-text transition-colors cursor-pointer"
                          >
                            {p + 1}
                          </button>
                        )
                      );
                    }
                  }
                  return items;
                })()}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="px-2.5 py-1.5 text-xs bg-wow-panel border border-wow-border-light rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:border-wow-border-gold transition-colors text-wow-text-dim hover:text-wow-text"
                >
                  Next
                </button>
              </div>
            )}
          </WoWPanel>
        </div>
      </div>
    </div>
  );
}
