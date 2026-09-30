vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import { ApiError } from '@/lib/api';
import { run } from './result';

describe('run', () => {
  it('wraps success', async () => {
    expect(await run(async () => 42)).toEqual({ ok: true, data: 42 });
  });

  it('turns expected API errors into a failed result the form can show', async () => {
    for (const status of [400, 401, 403, 404, 409, 503]) {
      expect(await run(async () => Promise.reject(new ApiError(status, `e${status}`)))).toEqual({ ok: false, error: `e${status}` });
    }
  });

  it('rethrows anything unexpected so the error boundary handles it', async () => {
    await expect(run(async () => Promise.reject(new ApiError(500, 'server')))).rejects.toThrow('server');
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
  });
});
