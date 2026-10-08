// @vitest-environment node
import { dynamic, GET } from './route';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

beforeEach(() => {
  fetchMock.mockReset();
  process.env.API_URL = 'http://api.test';
});

describe('GET /api/health', () => {
  it('reports the API as up when its /health answers 200', async () => {
    fetchMock.mockResolvedValue(new Response('{"status":"ok"}', { status: 200 }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', api: 'up' });
    const [url, init] = fetchMock.mock.calls[0] as [URL, RequestInit];
    expect(String(url)).toBe('http://api.test/health');
    expect(init.cache).toBe('no-store');
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it('stays 200 when the API is unreachable, so the frontend task is not killed', async () => {
    fetchMock.mockRejectedValue(new TypeError('fetch failed'));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok', api: 'down' });
  });

  it('reports the API as down when its health check fails', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 500 }));
    expect(await (await GET()).json()).toEqual({ status: 'ok', api: 'down' });
  });

  it('gives up on a hung API after the timeout', async () => {
    fetchMock.mockImplementation(
      (_url: URL, init: RequestInit) =>
        new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(init.signal?.reason))),
    );
    const started = Date.now();
    expect(await (await GET()).json()).toEqual({ status: 'ok', api: 'down' });
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it('is never cached', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 200 }));
    expect(dynamic).toBe('force-dynamic');
    expect((await GET()).headers.get('cache-control')).toBe('no-store');
  });
});
