import { NextResponse } from 'next/server';

/** Always run per request: a cached health answer is worthless to a load balancer. */
export const dynamic = 'force-dynamic';

const API_TIMEOUT_MS = 2_000;

/**
 * Frontend liveness for the container HEALTHCHECK and load balancer.
 * Always 200 while this server can answer: a backend outage is reported as `api: 'down'`
 * but must not get healthy frontend tasks killed.
 */
export async function GET() {
  return NextResponse.json(
    { status: 'ok', api: await apiStatus() },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

async function apiStatus(): Promise<'up' | 'down'> {
  try {
    const res = await fetch(new URL('/health', process.env.API_URL ?? 'http://localhost:4000'), {
      cache: 'no-store',
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });
    await res.body?.cancel(); // only the status matters; release the socket
    return res.ok ? 'up' : 'down';
  } catch {
    return 'down';
  }
}
