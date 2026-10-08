// @vitest-environment node
const { cookies } = vi.hoisted(() => ({ cookies: vi.fn() }));
vi.mock('next/headers', () => ({ cookies }));

import { ApiError } from './api';
import { CATALOG_REVALIDATE_SECONDS, getCatalog, getCatalogItem, publicApiFetch } from './public-api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const item = (name: string) => ({ id: name, name, description: null, sellingPrice: '1.00', inStock: true });
const page = (names: string[], p: number, totalPages: number) => ({
  data: names.map(item),
  meta: { page: p, limit: 100, total: names.length, totalPages },
});

beforeEach(() => {
  fetchMock.mockReset();
  cookies.mockClear();
  process.env.API_URL = 'http://api.test';
  delete process.env.NEXT_PHASE;
});

describe('publicApiFetch', () => {
  it('calls the API without auth or cookies, cached for the ISR window', async () => {
    fetchMock.mockResolvedValue(json(200, { ok: 1 }));
    await expect(publicApiFetch('/catalog', { query: { search: '', page: 2 } })).resolves.toEqual({ ok: 1 });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit & { next: { revalidate: number } }];
    expect(String(url)).toBe('http://api.test/catalog?page=2');
    expect(init.next.revalidate).toBe(CATALOG_REVALIDATE_SECONDS);
    expect(init.cache).toBeUndefined(); // no-store would make the page dynamic
    expect(JSON.stringify(init.headers ?? {})).not.toMatch(/authorization/i);
    expect(cookies).not.toHaveBeenCalled();
  });

  it('turns error responses into ApiError', async () => {
    fetchMock.mockResolvedValue(json(404, { statusCode: 404, message: 'Product not found' }));
    await expect(publicApiFetch('/catalog/x')).rejects.toMatchObject({ status: 404, message: 'Product not found' });
  });

  it('reports an unreachable API as 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(publicApiFetch('/catalog')).rejects.toMatchObject({ status: 503 });
  });
});

describe('getCatalog', () => {
  it('collects every page of active products', async () => {
    fetchMock
      .mockResolvedValueOnce(json(200, page(['A', 'B'], 1, 2)))
      .mockResolvedValueOnce(json(200, page(['C'], 2, 2)));
    const products = await getCatalog();
    expect(products?.map((p) => p.name)).toEqual(['A', 'B', 'C']);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      'http://api.test/catalog?page=1&limit=100',
      'http://api.test/catalog?page=2&limit=100',
    ]);
  });

  it('returns null during next build when the API is unreachable', async () => {
    process.env.NEXT_PHASE = 'phase-production-build';
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(getCatalog()).resolves.toBeNull();
  });

  it('throws at runtime so ISR keeps serving the last good page', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(getCatalog()).rejects.toBeInstanceOf(ApiError);
  });
});

describe('getCatalogItem', () => {
  it('returns the product', async () => {
    fetchMock.mockResolvedValue(json(200, item('Milo')));
    await expect(getCatalogItem('abc')).resolves.toMatchObject({ name: 'Milo' });
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/catalog/abc');
  });

  it.each([404, 400])('returns null for a %i', async (status) => {
    fetchMock.mockResolvedValue(json(status, { message: 'nope' }));
    await expect(getCatalogItem('abc')).resolves.toBeNull();
  });

  it('escapes the id into a single path segment', async () => {
    fetchMock.mockResolvedValue(json(404, {}));
    await getCatalogItem('../users');
    expect(String(fetchMock.mock.calls[0][0])).toBe('http://api.test/catalog/..%2Fusers');
  });

  it('rethrows other failures', async () => {
    fetchMock.mockResolvedValue(json(500, { message: 'boom' }));
    await expect(getCatalogItem('abc')).rejects.toMatchObject({ status: 500 });
  });
});
