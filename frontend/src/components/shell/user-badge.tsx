import { cn } from '@/lib/utils';

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?';
}

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary', className)}
    >
      {initials(name)}
    </span>
  );
}
