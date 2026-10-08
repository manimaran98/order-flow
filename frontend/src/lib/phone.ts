/** Malaysian national number (digits after +60 / leading 0), or null when it isn't one. */
function nationalDigits(raw: string): string | null {
  const digits = raw.replace(/[^\d+]/g, '');
  if (digits.startsWith('+60')) return digits.slice(3);
  if (digits.startsWith('60') && digits.length >= 10) return digits.slice(2);
  if (digits.startsWith('0')) return digits.slice(1);
  return null;
}

/**
 * Displays a Malaysian number the way people write it: +60 12-345 6789, +60 11-2222 3333,
 * +60 3-5123 4567. Anything that isn't a recognisable Malaysian number is returned unchanged.
 */
export function formatPhoneMY(raw: string): string {
  const n = nationalDigits(raw);
  if (!n || !/^\d+$/.test(n)) return raw;

  // Mobile: 01X. 011 and 015 numbers carry 8 subscriber digits, the rest 7.
  if (n.startsWith('1')) {
    const prefix = n.slice(0, 2);
    const rest = n.slice(2);
    if (rest.length === 8) return `+60 ${prefix}-${rest.slice(0, 4)} ${rest.slice(4)}`;
    if (rest.length === 7) return `+60 ${prefix}-${rest.slice(0, 3)} ${rest.slice(3)}`;
    return raw;
  }
  // Klang Valley landline: 03 + 8 digits.
  if (n.startsWith('3') && n.length === 9) return `+60 3-${n.slice(1, 5)} ${n.slice(5)}`;
  // Other landlines: area code + 7 digits.
  if (n.length === 8) return `+60 ${n[0]}-${n.slice(1, 4)} ${n.slice(4)}`;
  return raw;
}

/** tel: link in international form, so it dials correctly from any phone. */
export function telHref(raw: string): string {
  const n = nationalDigits(raw);
  return `tel:${n ? `+60${n}` : raw.replace(/[^\d+]/g, '')}`;
}
