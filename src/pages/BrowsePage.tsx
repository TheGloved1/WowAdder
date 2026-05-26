import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import { WoWSeparator } from '@/components/ui/separator';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AddonGrid from '../components/AddonGrid';
import FiltersSidebar from '../components/FiltersSidebar';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import type { SortOption } from '../components/SortSelector';
import SortSelector from '../components/SortSelector';
import { useGameVersions, useSearchMods } from '../hooks/useCurseforge';
import { getCategoryTree, getClientStatus } from '../services/curseforge';
import { loadPrefs, savePrefs } from '../services/preferences';

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

function parseCsvParam(value: string | null): string[] {
  if (!value) return [];
  return value.split(',').filter(Boolean);
}

function parseNumCsvParam(value: string | null): number[] {
  if (!value) return [];
  return value
    .split(',')
    .filter(Boolean)
    .map(Number)
    .filter((n) => !isNaN(n));
}

export default function BrowsePage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const prefs = loadPrefs();

  const versionsQuery = useGameVersions(1);
  const rawVersions = versionsQuery.data ?? [];

  const sortedVersions = useMemo(() => {
    return sortVersionsDesc(rawVersions.flatMap((vt) => vt.versions));
  }, [rawVersions]);

  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>(
    parseNumCsvParam(searchParams.get('categoryIds')),
  );
  const [excludedCategoryIds, setExcludedCategoryIds] = useState<number[]>(
    parseNumCsvParam(searchParams.get('excludedCategoryIds')),
  );
  const [selectedVersions, setSelectedVersions] = useState<string[]>(() => {
    const urlVersions = parseCsvParam(searchParams.get('versions'));
    return urlVersions.length > 0 ? urlVersions : prefs.versions;
  });
  const [sortOption, setSortOption] = useState<SortOption>(prefs.sortOption);

  const [currentPage, setCurrentPage] = useState(Math.max(0, (Number(searchParams.get('page')) || 1) - 1));
  const [pageSize, setPageSize] = useState(Number(searchParams.get('pageSize')) || prefs.pageSize);

  const apiGameVersion = selectedVersions.length > 0 ? selectedVersions.join(',') : undefined;
  const hasClientFilters = selectedCategoryIds.length > 0 || excludedCategoryIds.length > 0;
  const effectivePageSize = hasClientFilters ? Math.min(pageSize * 3, 50) : pageSize;

  const searchModsQuery = useSearchMods({
    gameVersionTypeId: 517,
    gameVersion: apiGameVersion,
    searchFilter: searchQuery || undefined,
    sortField: String(sortOption.field),
    sortOrder: sortOption.order,
    index: currentPage * effectivePageSize,
    pageSize: effectivePageSize,
  });

  const apiAddons = searchModsQuery.data?.addons ?? [];
  const pagination = searchModsQuery.data?.pagination ?? null;
  const loading = !searchModsQuery.isError && (searchModsQuery.isLoading || searchModsQuery.isPlaceholderData);
  const error = searchModsQuery.error?.message ?? null;

  const addons = useMemo(() => {
    let result = apiAddons;

    if (selectedCategoryIds.length > 0) {
      result = result.filter((mod) => mod.categories?.some((c: { id: number }) => selectedCategoryIds.includes(c.id)));
    }

    if (excludedCategoryIds.length > 0) {
      result = result.filter((mod) => !mod.categories?.some((c: { id: number }) => excludedCategoryIds.includes(c.id)));
    }

    return result.slice(0, pageSize);
  }, [apiAddons, selectedCategoryIds, excludedCategoryIds, pageSize]);

  const categories = getCategoryTree();
  const clientStatus = getClientStatus();

  function syncUrl(
    q: string,
    catIds: number[],
    exclCatIds: number[],
    vers: string[],
    sf: number,
    so: string,
    ps: number,
    page: number,
  ) {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (catIds.length) params.set('categoryIds', catIds.join(','));
    if (exclCatIds.length) params.set('excludedCategoryIds', exclCatIds.join(','));
    if (vers.length) params.set('versions', vers.join(','));
    params.set('sortField', String(sf));
    params.set('sortOrder', so);
    if (ps !== 20) params.set('pageSize', String(ps));
    if (page > 0) params.set('page', String(page + 1));
    setSearchParams(params, { replace: false });
  }

  function handleSearch() {
    setCurrentPage(0);
    syncUrl(
      searchQuery,
      selectedCategoryIds,
      excludedCategoryIds,
      selectedVersions,
      sortOption.field,
      sortOption.order,
      pageSize,
      0,
    );
  }

  function handleCategoryChange(selected: number[], excluded: number[]) {
    setSelectedCategoryIds(selected);
    setExcludedCategoryIds(excluded);
    setCurrentPage(0);
    syncUrl(searchQuery, selected, excluded, selectedVersions, sortOption.field, sortOption.order, pageSize, 0);
  }

  function handleVersionChange(versions: string[]) {
    setSelectedVersions(versions);
    setCurrentPage(0);
    syncUrl(
      searchQuery,
      selectedCategoryIds,
      excludedCategoryIds,
      versions,
      sortOption.field,
      sortOption.order,
      pageSize,
      0,
    );
    savePrefs({ versions });
  }

  function handleSortChange(option: SortOption) {
    setSortOption(option);
    setCurrentPage(0);
    syncUrl(
      searchQuery,
      selectedCategoryIds,
      excludedCategoryIds,
      selectedVersions,
      option.field,
      option.order,
      pageSize,
      0,
    );
    savePrefs({ sortOption: option });
  }

  function handleAddonClick(id: number) {
    const params = new URLSearchParams();
    if (searchQuery) params.set('q', searchQuery);
    if (selectedCategoryIds.length) params.set('categoryIds', selectedCategoryIds.join(','));
    if (excludedCategoryIds.length) params.set('excludedCategoryIds', excludedCategoryIds.join(','));
    if (selectedVersions.length) params.set('versions', selectedVersions.join(','));
    params.set('sortField', String(sortOption.field));
    params.set('sortOrder', sortOption.order);
    if (pageSize !== 20) params.set('pageSize', String(pageSize));
    if (currentPage > 0) params.set('page', String(currentPage + 1));
    const versionParam = selectedVersions.length > 0 ? `?version=${encodeURIComponent(selectedVersions.join(','))}` : '';
    navigate(`/addon/${id}${versionParam}`, {
      state: { searchParams: Object.fromEntries(params) },
    });
  }

  function handlePageChange(newPage: number) {
    setCurrentPage(newPage);
    syncUrl(
      searchQuery,
      selectedCategoryIds,
      excludedCategoryIds,
      selectedVersions,
      sortOption.field,
      sortOption.order,
      pageSize,
      newPage,
    );
  }

  function handlePageSizeChange(size: number) {
    setPageSize(size);
    setCurrentPage(0);
    syncUrl(
      searchQuery,
      selectedCategoryIds,
      excludedCategoryIds,
      selectedVersions,
      sortOption.field,
      sortOption.order,
      size,
      0,
    );
    savePrefs({ pageSize: size });
  }

  function handleClearAll() {
    setSelectedCategoryIds([]);
    setExcludedCategoryIds([]);
    setSelectedVersions([]);
    setCurrentPage(0);
    syncUrl(searchQuery, [], [], [], sortOption.field, sortOption.order, pageSize, 0);
    savePrefs({ versions: [] });
  }

  const totalPages = pagination ? Math.ceil(pagination.totalCount / effectivePageSize) : 0;
  const isFilterAccurate = selectedCategoryIds.length === 0 && excludedCategoryIds.length === 0;

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
          selectedCategoryIds={selectedCategoryIds}
          excludedCategoryIds={excludedCategoryIds}
          onCategoryChange={handleCategoryChange}
          selectedVersions={selectedVersions}
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
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 0}
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
                      <span className='text-wow-gold'>{currentPage + 1}</span>
                      <span className='text-wow-text-muted'> of {totalPages}</span>
                    </span>
                  : <span className='text-wow-text-dim font-wow-heading min-w-12 text-center text-xs tracking-wider'>
                      <span className='text-wow-gold'>{currentPage + 1}</span>
                    </span>
                  }
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages - 1}
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
                <Select value={String(pageSize)} onValueChange={(v) => handlePageSizeChange(Number(v))}>
                  <SelectTrigger className='w-[80px]'>
                    <span>{pageSize}</span>
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

            {!loading && addons.length === 0 && apiAddons.length > 0 && (hasClientFilters || selectedVersions.length > 0) ?
              <p className='text-wow-text-muted py-12 text-center text-sm'>
                No results match your filters on this page. Try a different page or clear filters.
              </p>
            : <AddonGrid addons={addons} onAddonClick={handleAddonClick} loading={loading} error={error} />}

            {totalPages > 1 && (
              <div className='border-wow-border-light mt-6 flex justify-center border-t pt-4'>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
