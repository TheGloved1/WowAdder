import { useCallback, useRef } from 'react';
import type { SortOption } from '../components/SortSelector';
import { SORT_OPTIONS } from '../components/SortSelector';
import { usePreferences } from './usePreferences';

export interface BrowseParams {
  q: string;
  categoryIds: number[];
  excludedCategoryIds: number[];
  versions: string[];
  sortField: number;
  sortOrder: string;
  pageSize: number;
  page: number;
}

const DEFAULTS: BrowseParams = {
  q: '',
  categoryIds: [],
  excludedCategoryIds: [],
  versions: [],
  sortField: 6,
  sortOrder: 'desc',
  pageSize: 20,
  page: 0,
};

function findSortOption(field: number, order: string): SortOption {
  return SORT_OPTIONS.find((o) => o.field === field && o.order === order) ?? SORT_OPTIONS[0];
}

interface UseBrowseParamsReturn {
  params: BrowseParams;
  setParam: <K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => void;
  updateParams: (patch: Partial<BrowseParams>) => void;
  clearAll: () => void;
}

export function useBrowseParams(): UseBrowseParamsReturn {
  const { prefs, updatePrefs } = usePreferences();
  const pageRef = useRef(0);

  const sortFromPrefs = prefs.sortOption || SORT_OPTIONS[0];

  const params: BrowseParams = {
    q: prefs.searchQuery ?? DEFAULTS.q,
    categoryIds: prefs.categoryIds ?? DEFAULTS.categoryIds,
    excludedCategoryIds: prefs.excludedCategoryIds ?? DEFAULTS.excludedCategoryIds,
    versions: prefs.versions ?? DEFAULTS.versions,
    sortField: sortFromPrefs.field,
    sortOrder: sortFromPrefs.order,
    pageSize: prefs.pageSize ?? DEFAULTS.pageSize,
    page: pageRef.current,
  };

  const setParam = useCallback(
    <K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => {
      if (key === 'page') {
        pageRef.current = value as number;
        return;
      }
      const prefUpdates: Partial<typeof prefs> = {};
      if (key === 'q') prefUpdates.searchQuery = value as string;
      if (key === 'categoryIds') prefUpdates.categoryIds = value as number[];
      if (key === 'excludedCategoryIds') prefUpdates.excludedCategoryIds = value as number[];
      if (key === 'versions') prefUpdates.versions = value as string[];
      if (key === 'sortField') {
        prefUpdates.sortOption = findSortOption(value as number, prefs.sortOption.order);
      }
      if (key === 'sortOrder') {
        prefUpdates.sortOption = findSortOption(prefs.sortOption.field, value as string);
      }
      if (key === 'pageSize') prefUpdates.pageSize = value as number;
      updatePrefs(prefUpdates);
    },
    [prefs, updatePrefs],
  );

  const updateParams = useCallback(
    (patch: Partial<BrowseParams>) => {
      if ('page' in patch) {
        pageRef.current = patch.page ?? 0;
      }
      const prefUpdates: Partial<typeof prefs> = {};
      if ('q' in patch) prefUpdates.searchQuery = patch.q;
      if ('categoryIds' in patch) prefUpdates.categoryIds = patch.categoryIds;
      if ('excludedCategoryIds' in patch) prefUpdates.excludedCategoryIds = patch.excludedCategoryIds;
      if ('versions' in patch) prefUpdates.versions = patch.versions;
      if ('sortField' in patch || 'sortOrder' in patch) {
        prefUpdates.sortOption = findSortOption(
          patch.sortField ?? prefs.sortOption.field,
          patch.sortOrder ?? prefs.sortOption.order,
        );
      }
      if ('pageSize' in patch) prefUpdates.pageSize = patch.pageSize;
      updatePrefs(prefUpdates);
    },
    [prefs, updatePrefs],
  );

  const clearAll = useCallback(() => {
    pageRef.current = 0;
    updatePrefs({
      searchQuery: '',
      categoryIds: [],
      excludedCategoryIds: [],
      versions: [],
      sortOption: SORT_OPTIONS[0],
      pageSize: 20,
    });
  }, [updatePrefs]);

  return { params, setParam, updateParams, clearAll };
}
