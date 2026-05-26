import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { WoWSeparator } from '@/components/ui/separator';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AddonGrid from '../components/AddonGrid';
import FiltersSidebar from '../components/FiltersSidebar';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import type { SortOption } from '../components/SortSelector';
import SortSelector, { SORT_OPTIONS } from '../components/SortSelector';
import { useBrowseParams } from '../hooks/useBrowseParams';
import { useGameVersions, useSearchMods } from '../hooks/useCurseforge';
import { getCategoryTree, getClientStatus } from '../services/curseforge';
import { savePrefs } from '../services/preferences';

function sortVersionsDesc(versions: string[]): string[] {
  return [...versions].sort((a, b) => {
    const pa = a.split('.').map(Number);
    const pb = b.split('.').map(Number);
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
  const { params, updateParams, clearAll, buildUrl } = useBrowseParams();

  const [searchQuery, setSearchQuery] = useState(params.q);
  useEffect(() => {
    setSearchQuery(params.q);
  }, [params.q]);

  const sortOption: SortOption =
    SORT_OPTIONS.find((o) => o.field === params.sortField && o.order === params.sortOrder) ?? SORT_OPTIONS[0];

  const versionsQuery = useGameVersions(1);
  const rawVersions = versionsQuery.data ?? [];

  const sortedVersions = useMemo(() => {
    return sortVersionsDesc(rawVersions.flatMap((vt) => vt.versions));
  }, [rawVersions]);

  const apiGameVersion = params.versions.length > 0 ? params.versions.join(',') : undefined;
  const hasClientFilters = params.categoryIds.length > 0 || params.excludedCategoryIds.length > 0;
  const effectivePageSize = hasClientFilters ? Math.min(params.pageSize * 3, 50) : params.pageSize;

  const searchModsQuery = useSearchMods({
    gameVersionTypeId: 517,
    gameVersion: apiGameVersion,
    searchFilter: searchQuery || undefined,
    sortField: String(sortOption.field),
    sortOrder: sortOption.order,
    index: params.page * effectivePageSize,
    pageSize: effectivePageSize,
  });

  const apiAddons = searchModsQuery.data?.addons ?? [];
  const pagination = searchModsQuery.data?.pagination ?? null;
  const loading = !searchModsQuery.isError && (searchModsQuery.isLoading || searchModsQuery.isPlaceholderData);
  const error = searchModsQuery.error?.message ?? null;

  const addons = useMemo(() => {
    let result = apiAddons;

    if (params.categoryIds.length > 0) {
      result = result.filter((mod) => mod.categories?.some((c: { id: number }) => params.categoryIds.includes(c.id)));
    }

    if (params.excludedCategoryIds.length > 0) {
      result = result.filter(
        (mod) => !mod.categories?.some((c: { id: number }) => params.excludedCategoryIds.includes(c.id)),
      );
    }

    return result.slice(0, params.pageSize);
  }, [apiAddons, params.categoryIds, params.excludedCategoryIds, params.pageSize]);

  const categories = getCategoryTree();
  const clientStatus = getClientStatus();

  function handleSearch() {
    updateParams({ q: searchQuery, page: 0 });
  }

  function handleCategoryChange(selected: number[], excluded: number[]) {
    updateParams({ categoryIds: selected, excludedCategoryIds: excluded, page: 0 });
  }

  function handleVersionChange(versions: string[]) {
    updateParams({ versions, page: 0 });
    savePrefs({ versions });
  }

  function handleSortChange(option: SortOption) {
    updateParams({ sortField: option.field, sortOrder: option.order, page: 0 });
    savePrefs({ sortOption: option });
  }

  function handleAddonClick(id: number) {
    const versionParam = params.versions.length > 0 ? `?version=${encodeURIComponent(params.versions.join(','))}` : '';
    navigate(`/addon/${id}${versionParam}`, {
      state: { searchParams: Object.fromEntries(buildUrl()) },
    });
  }

  function handlePageChange(page: number) {
    updateParams({ page });
  }

  function handlePageSizeChange(pageSize: number) {
    updateParams({ pageSize, page: 0 });
    savePrefs({ pageSize });
  }

  function handleClearAll() {
    clearAll();
    savePrefs({ versions: [] });
  }

  const totalPages = pagination ? Math.ceil(pagination.totalCount / effectivePageSize) : 0;
  const isFilterAccurate = params.categoryIds.length === 0 && params.excludedCategoryIds.length === 0;

  return (
    <div className='mx-auto max-w-7xl px-4 py-6'>
      {!clientStatus.configured && (
        <div className='bg-wow-danger/10 border-wow-danger/30 mb-4 flex items-center gap-3 rounded-sm border p-3'>
          <svg className='text-wow-danger h-5 w-5 shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
            />
          </svg>
          <p className='text-wow-text-dim text-sm'>
            <span className='text-wow-gold font-wow-heading'>CurseForge API key</span> not configured. Set{' '}
            <code className='text-wow-gold bg-wow-border-gold/10 rounded-sm px-1'>VITE_CURSEFORGE_API_KEY</code> in your{' '}
            <code className='text-wow-gold bg-wow-border-gold/10 rounded-sm px-1'>.env</code> file.
          </p>
        </div>
      )}

      <div className='mb-6'>
        <SearchBar value={searchQuery} onChange={setSearchQuery} onSearch={handleSearch} />
      </div>

      <div className='flex gap-6'>
        <FiltersSidebar
          categories={categories}
          selectedCategoryIds={params.categoryIds}
          excludedCategoryIds={params.excludedCategoryIds}
          onCategoryChange={handleCategoryChange}
          selectedVersions={params.versions}
          onVersionChange={handleVersionChange}
          onClearAll={handleClearAll}
          versions={sortedVersions}
        />
        <div className='min-w-0 flex-1'>
          <Card>
            <div className='flex items-center gap-3 p-4'>
              {totalPages > 0 ?
                <div className='flex shrink-0 items-center gap-0.5'>
                  <button
                    onClick={() => handlePageChange(params.page - 1)}
                    disabled={params.page === 0}
                    className='text-wow-text-dim hover:text-wow-gold flex size-6 items-center justify-center p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-30'
                    aria-label='Previous Page'
                  >
                    <svg className='size-3' viewBox='0 0 10 10' fill='none'>
                      <path
                        d='M7 2L3 5L7 8'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                  {isFilterAccurate ?
                    <span className='text-wow-text-dim font-wow-heading min-w-18 text-center text-xs tracking-wider'>
                      <span className='text-wow-gold'>{params.page + 1}</span>
                      <span className='text-wow-text-muted'> of {totalPages}</span>
                    </span>
                  : <span className='text-wow-text-dim font-wow-heading min-w-12 text-center text-xs tracking-wider'>
                      <span className='text-wow-gold'>{params.page + 1}</span>
                    </span>
                  }
                  <button
                    onClick={() => handlePageChange(params.page + 1)}
                    disabled={params.page >= totalPages - 1}
                    className='text-wow-text-dim hover:text-wow-gold flex size-6 items-center justify-center p-0 transition-colors disabled:cursor-not-allowed disabled:opacity-30'
                    aria-label='Next Page'
                  >
                    <svg className='size-3' viewBox='0 0 10 10' fill='none'>
                      <path
                        d='M3 2L7 5L3 8'
                        stroke='currentColor'
                        strokeWidth='1.5'
                        strokeLinecap='round'
                        strokeLinejoin='round'
                      />
                    </svg>
                  </button>
                </div>
              : <div />}
              {loading ?
                <span className='text-wow-text-muted text-xs'>Loading...</span>
              : pagination ?
                isFilterAccurate ?
                  <span className='text-wow-text-dim text-xs'>
                    <span className='text-wow-gold font-wow-heading'>
                      {pagination.totalCount >= 10000 ?
                        `${pagination.totalCount.toLocaleString()}+`
                      : pagination.totalCount.toLocaleString()}
                    </span>{' '}
                    Results
                  </span>
                : <span className='text-wow-text-dim text-xs'>
                    <span className='text-wow-gold font-wow-heading'>{addons.length}</span>
                    <span className='text-wow-text-muted'> on this page</span>
                    <span className='text-wow-text-muted'> of </span>
                    <span className='text-wow-text-dim'>
                      {pagination.totalCount >= 10000 ?
                        `${pagination.totalCount.toLocaleString()}+`
                      : pagination.totalCount.toLocaleString()}
                    </span>
                    <span className='text-wow-text-muted'> total</span>
                  </span>

              : null}
              <div className='flex-1' />
              <div className='flex items-center gap-4'>
                <SortSelector value={sortOption} onChange={handleSortChange} />
                <Select value={String(params.pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
                  <SelectTrigger className='w-[80px]'>
                    <span>{params.pageSize}</span>
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50].map((s) => (
                      <SelectItem key={s} value={String(s)}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <WoWSeparator className='mb-4' />

            {!loading && addons.length === 0 && apiAddons.length > 0 && (hasClientFilters || params.versions.length > 0) ?
              <p className='text-wow-text-muted py-12 text-center text-sm'>
                No results match your filters on this page. Try a different page or clear filters.
              </p>
            : <AddonGrid addons={addons} onAddonClick={handleAddonClick} loading={loading} error={error} />}

            {totalPages > 1 && (
              <div className='border-wow-border-light mt-6 flex justify-center border-t pt-4'>
                <Pagination currentPage={params.page} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
