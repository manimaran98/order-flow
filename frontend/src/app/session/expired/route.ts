import { NextResponse } from 'next/server';
import { SESSION_COOKIE } from '@/lib/session-cookie';

/**
 * Server Components cannot delete cookies, so an API 401 during rendering redirects here.
 * The Location is relative: request.url carries the server's bind address (0.0.0.0 in Docker).
 */
export function GET() {
  const response = new NextResponse(null, { status: 307, headers: { Location: '/login?expired=1' } });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
