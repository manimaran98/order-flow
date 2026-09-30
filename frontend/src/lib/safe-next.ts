/** Only same-site paths survive; anything else (other hosts, protocol-relative, junk) goes to the dashboard. */
export function safeNext(value: unknown): string {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\')
    ? value
    : '/dashboard';
}
