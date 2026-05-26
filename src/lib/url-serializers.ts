export interface QueryParamSerializer<T> {
  parse: (raw: string | null) => T;
  serialize: (value: T) => string | null;
}

export const csvString: QueryParamSerializer<string[]> = {
  parse: (raw) => (raw ? raw.split(',').filter(Boolean) : []),
  serialize: (v) => (v.length ? v.join(',') : null),
};

export const csvNumber: QueryParamSerializer<number[]> = {
  parse: (raw) =>
    raw ?
      raw
        .split(',')
        .filter(Boolean)
        .map(Number)
        .filter((n) => !isNaN(n))
    : [],
  serialize: (v) => (v.length ? v.join(',') : null),
};

export const integer: QueryParamSerializer<number> = {
  parse: (raw) => {
    const n = Number(raw);
    return isNaN(n) ? 0 : n;
  },
  serialize: (v) => String(v),
};

export const text: QueryParamSerializer<string> = {
  parse: (raw) => raw ?? '',
  serialize: (v) => (v ? v : null),
};
