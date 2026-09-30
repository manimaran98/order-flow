import { revalidatePath } from 'next/cache';
import { ApiError } from '@/lib/api';

export type ActionResult<T = undefined> = { ok: true; data: T } | { ok: false; error: string };
export type FormAction<T = undefined> = (prev: ActionResult<T> | null, formData: FormData) => Promise<ActionResult<T>>;

const EXPECTED = new Set([400, 401, 403, 404, 409, 503]);

/** Runs an API call; business errors become a result the UI shows, anything else goes to the error boundary. */
export async function run<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (err) {
    if (err instanceof ApiError && EXPECTED.has(err.status)) return { ok: false, error: err.message };
    throw err;
  }
}

/** Every page is dynamic operational data; after a mutation, refresh them all. */
export function refreshAll() {
  revalidatePath('/', 'layout');
}
