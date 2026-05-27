import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { csvNumber, csvString, integer, text } from '../lib/url-serializers';
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

export function buildBrowseUrl(params: BrowseParams): URLSearchParams {
  const urlSearchParams = new URLSearchParams();
  const set = (k: string, v: string | null) => {
    if (v !== null) urlSearchParams.set(k, v);
  };

  set('q', text.serialize(params.q));
  set('categoryIds', csvNumber.serialize(params.categoryIds));
  set('excludedCategoryIds', csvNumber.serialize(params.excludedCategoryIds));
  set('versions', csvString.serialize(params.versions));
  if (params.sortField !== DEFAULTS.sortField) set('sortField', String(params.sortField));
  if (params.sortOrder !== DEFAULTS.sortOrder) set('sortOrder', params.sortOrder);
  if (params.pageSize !== DEFAULTS.pageSize) set('pageSize', String(params.pageSize));
  if (params.page > 0) set('page', String(params.page + 1));

  return urlSearchParams;
}

function parsePage(raw: string | null): number {
  const n = Number(raw);
  return isNaN(n) || n < 1 ? 0 : n - 1;
}

interface UseBrowseParamsReturn {
  params: BrowseParams;
  setParam: <K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => void;
  updateParams: (patch: Partial<BrowseParams>) => void;
  clearAll: () => void;
  buildUrl: () => URLSearchParams;
}

export function useBrowseParams(): UseBrowseParamsReturn {
  const [searchParams, setSearchParams] = useSearchParams();
  const { prefs, updatePrefs } = usePreferences();

  const [params, setParams] = useState<BrowseParams>(() => ({
    q: text.parse(searchParams.get('q')),
    categoryIds: csvNumber.parse(searchParams.get('categoryIds')),
    excludedCategoryIds: csvNumber.parse(searchParams.get('excludedCategoryIds')),
    versions: (() => {
      const url = csvString.parse(searchParams.get('versions'));
      return url.length > 0 ? url : (prefs.versions ?? DEFAULTS.versions);
    })(),
    sortField: integer.parse(searchParams.get('sortField')) || prefs.sortOption.field || DEFAULTS.sortField,
    sortOrder: searchParams.get('sortOrder') || prefs.sortOption.order || DEFAULTS.sortOrder,
    pageSize: integer.parse(searchParams.get('pageSize')) || prefs.pageSize || DEFAULTS.pageSize,
    page: parsePage(searchParams.get('page')),
  }));

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSearchParams(buildBrowseUrl(params), { replace: true });
  }, [params, setSearchParams]);

  useEffect(() => {
    if (!searchParams.get('versions') && prefs.versions.length > 0) {
      setSearchParams(buildBrowseUrl({ ...params, versions: prefs.versions }), { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isFirstRender.current) return;
    updatePrefs({ versions: params.versions });
  }, [params.versions, updatePrefs]);

  const setParam = useCallback(<K extends keyof BrowseParams>(key: K, value: BrowseParams[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateParams = useCallback((patch: Partial<BrowseParams>) => {
    setParams((prev) => ({ ...prev, ...patch }));
  }, []);

  const clearAll = useCallback(() => {
    setParams(DEFAULTS);
  }, []);

  const buildUrl = useCallback(() => buildBrowseUrl(params), [params]);

  return { params, setParam, updateParams, clearAll, buildUrl };
}
