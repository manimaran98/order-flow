/** Trimmed text, or undefined when blank (field left unchanged / omitted). */
export function text(fd: FormData, key: string): string | undefined {
  const value = fd.get(key);
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Trimmed text, or null when blank (clears a nullable field on update). */
export function textOrNull(fd: FormData, key: string): string | null {
  return text(fd, key) ?? null;
}

export function num(fd: FormData, key: string): number | undefined {
  const value = text(fd, key);
  return value === undefined ? undefined : Number(value);
}
