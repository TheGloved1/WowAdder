import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { QueryParamSerializer } from '../lib/url-serializers';

export function useQueryParam<T>(
  key: string,
  serializer: QueryParamSerializer<T>,
  defaultValue: T,
): [T, (value: T | ((prev: T) => T)) => void] {
  const [searchParams, setSearchParams] = useSearchParams();

  const raw = searchParams.get(key);
  const value: T = raw !== null ? serializer.parse(raw) : defaultValue;

  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setSearchParams(
        (prev) => {
          const nextParams = new URLSearchParams(prev);
          const resolved = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
          const serialized = serializer.serialize(resolved);
          if (serialized !== null) {
            nextParams.set(key, serialized);
          } else {
            nextParams.delete(key);
          }
          return nextParams;
        },
        { replace: true },
      );
    },
    [key, serializer, value, setSearchParams],
  );

  return [value, setValue];
}
