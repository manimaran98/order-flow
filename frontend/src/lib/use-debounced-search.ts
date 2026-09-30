import { useEffect, useState } from 'react';

/** Debounced async search; late responses for an old query are ignored. */
export function useDebouncedSearch<T>(query: string, search: (q: string) => Promise<T[]>, delay = 250) {
  const [results, setResults] = useState<T[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const found = await search(q);
        if (!cancelled) setResults(found);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, delay);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, search, delay]);
  return { results: query.trim() ? results : [], loading };
}
