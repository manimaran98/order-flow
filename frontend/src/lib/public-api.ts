import 'server-only';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
import { ApiError, apiUrl, toApiError, type Query } from './api';
import type { CatalogItem, Paginated } from './types';

/** Keep in step with `export const revalidate` on the catalog pages (segment config must be a literal). */
export const CATALOG_REVALIDATE_SECONDS = 300;

/** The API caps page size at 100; 10 pages is far beyond an SME catalog. */
const CATALOG_PAGE_SIZE = 100;
const CATALOG_MAX_PAGES = 10;

/**
 * Unauthenticated, cacheable GET for statically generated (ISR) pages.
 * Never touches cookies or headers, so it does not opt the page into dynamic rendering
 * the way `apiFetch` does.
 */
export async function publicApiFetch<T>(
  path: string,
  { query, revalidate = CATALOG_REVALIDATE_SECONDS }: { query?: Query; revalidate?: number } = {},
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiUrl(path, query), { headers: { Accept: 'application/json' }, next: { revalidate } });
  } catch {
    throw new ApiError(503, 'Cannot reach the OrderFlow API');
  }
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) throw toApiError(res.status, data);
  return data as T;
}

const isBuildPhase = () => process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

/**
 * Every active product, for the catalog list page.
 *
 * `null` means the API was unreachable while `next build` prerendered the page (Docker and CI
 * build without an API); the page renders a placeholder that ISR replaces on the first
 * revalidation. At runtime failures throw instead, so ISR keeps serving the last good page.
 */
export async function getCatalog(): Promise<CatalogItem[] | null> {
  try {
    const items: CatalogItem[] = [];
    for (let page = 1; page <= CATALOG_MAX_PAGES; page++) {
      const res = await publicApiFetch<Paginated<CatalogItem>>('/catalog', {
        query: { page, limit: CATALOG_PAGE_SIZE },
      });
      items.push(...res.data);
      if (page >= res.meta.totalPages) break;
    }
    return items;
  } catch (err) {
    if (isBuildPhase()) return null;
    throw err;
  }
}

/** One active product, or null when it is missing, inactive or the id is malformed. */
export async function getCatalogItem(id: string): Promise<CatalogItem | null> {
  try {
    return await publicApiFetch<CatalogItem>(`/catalog/${encodeURIComponent(id)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 400)) return null;
    throw err;
  }
}
