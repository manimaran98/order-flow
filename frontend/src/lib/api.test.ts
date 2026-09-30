// @vitest-environment node
const { store, redirect, readOnly } = vi.hoisted(() => ({
  store: new Map<string, string>(),
  readOnly: { value: false },
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (k: string) => (store.has(k) ? { name: k, value: store.get(k) } : undefined),
    set: (k: string, v: string) => store.set(k, v),
    delete: (k: string) => {
      if (readOnly.value) throw new Error('Cookies can only be modified in a Server Action or Route Handler.');
      store.delete(k);
    },
  }),
}));
vi.mock('next/navigation', () => ({
  redirect,
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

import { ApiError, apiFetch, getOrNotFound, toApiError } from './api';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);
const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

beforeEach(() => {
  store.clear();
  readOnly.value = false;
  fetchMock.mockReset();
  redirect.mockClear();
  process.env.API_URL = 'http://api.test';
});

describe('apiFetch', () => {
  it('sends the session token as a bearer header and skips empty query values', async () => {
    store.set('of_session', 'tok');
    fetchMock.mockResolvedValue(json(200, { ok: 1 }));
    await apiFetch('/orders', { query: { status: 'PENDING', search: '', page: 2 } });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(String(url)).toBe('http://api.test/orders?status=PENDING&page=2');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.cache).toBe('no-store');
  });

  it('clears the cookie and goes to login when the API rejects our token (Server Action)', async () => {
    store.set('of_session', 'old');
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: 'Unauthorized' }));
    await expect(apiFetch('/auth/me')).rejects.toThrow('REDIRECT:/login?expired=1');
    expect(store.has('of_session')).toBe(false);
  });

  it('falls back to the /session/expired route while rendering (cookies are read-only there)', async () => {
    store.set('of_session', 'old');
    readOnly.value = true;
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: 'Unauthorized' }));
    await expect(apiFetch('/auth/me')).rejects.toThrow('REDIRECT:/session/expired');
  });

  it('reports a failed login as an ApiError instead of redirecting', async () => {
    store.set('of_session', 'stale');
    fetchMock.mockResolvedValue(json(401, { statusCode: 401, message: 'Invalid email or password' }));
    await expect(apiFetch('/auth/login', { method: 'POST', body: {}, auth: false })).rejects.toMatchObject({
      status: 401,
      message: 'Invalid email or password',
    });
    expect(redirect).not.toHaveBeenCalled();
    const [, init] = fetchMock.mock.calls[0] as [URL, RequestInit & { headers: Record<string, string> }];
    expect(init.headers.Authorization).toBeUndefined();
  });

  it('maps an unreachable API to a 503', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    await expect(apiFetch('/health')).rejects.toMatchObject({ status: 503, message: 'Cannot reach the OrderFlow API' });
  });

  it('returns undefined for 204 No Content', async () => {
    store.set('of_session', 'tok');
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    await expect(apiFetch('/customers/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });
});

describe('toApiError', () => {
  it('joins validation message arrays', () => {
    expect(toApiError(400, { message: ['a must be x', 'b must be y'] }).message).toBe('a must be x; b must be y');
  });

  it('keeps extra details such as stock numbers', () => {
    const err = toApiError(409, { statusCode: 409, error: 'Conflict', message: 'Insufficient stock', sku: 'COKE', requested: 3, available: 1 });
    expect(err).toBeInstanceOf(ApiError);
    expect(err.details).toEqual({ sku: 'COKE', requested: 3, available: 1 });
  });
});

describe('getOrNotFound', () => {
  it('turns 404 and malformed-id 400 into notFound()', async () => {
    await expect(getOrNotFound(Promise.reject(new ApiError(404, 'x')))).rejects.toThrow('NOT_FOUND');
    await expect(getOrNotFound(Promise.reject(new ApiError(400, 'x')))).rejects.toThrow('NOT_FOUND');
  });

  it('lets other errors through', async () => {
    await expect(getOrNotFound(Promise.reject(new ApiError(500, 'boom')))).rejects.toThrow('boom');
  });
});
