const twoDecimals = new Intl.NumberFormat('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** "1234.5" → "RM 1,234.50". Display only. */
export function formatRM(value: string | number): string {
  return `RM ${twoDecimals.format(Number(value))}`;
}

/** Exact conversion to integer sen; NaN unless the value is a non-negative amount with at most 2 decimals. */
export function toSen(value: string | number): number {
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(String(value).trim());
  if (!match) return NaN;
  return Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
}

export function fromSen(sen: number): string {
  return (sen / 100).toFixed(2);
}
