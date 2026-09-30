const PROBE_ORIGIN = 'http://orderflow.invalid';

/**
 * Only same-site paths survive. The value is parsed the way a browser would (which strips tab/CR/LF
 * and treats "\" as "/"), so tricks like "/\t/evil.example" can't become a protocol-relative URL.
 */
export function safeNext(value: unknown): string {
  if (typeof value !== 'string' || !value.startsWith('/')) return '/dashboard';
  try {
    const url = new URL(value, PROBE_ORIGIN);
    if (url.origin !== PROBE_ORIGIN) return '/dashboard';
    return url.pathname + url.search + url.hash;
  } catch {
    return '/dashboard';
  }
}
