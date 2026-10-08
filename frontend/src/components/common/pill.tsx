import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Same pill geometry as StatusBadge, so every state in the app reads as one vocabulary.
const pill = 'inline-flex h-[1.375rem] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset';

const TONE = {
  amber: { pill: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  rose: { pill: 'bg-rose-50 text-rose-800 ring-rose-600/20', dot: 'bg-rose-500' },
  emerald: { pill: 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', dot: 'bg-emerald-500' },
  zinc: { pill: 'bg-zinc-100 text-zinc-600 ring-zinc-500/20', dot: 'bg-zinc-400' },
  neutral: { pill: 'bg-background text-zinc-700 ring-zinc-500/25', dot: 'bg-zinc-400' },
} as const;

export type PillTone = keyof typeof TONE;

export function Pill({ tone, dot = true, icon, children, className }: { tone: PillTone; dot?: boolean; icon?: ReactNode; children: ReactNode; className?: string }) {
  const t = TONE[tone];
  return (
    <span className={cn(pill, t.pill, className)}>
      {icon ?? (dot && <span aria-hidden className={cn('size-1.5 rounded-full', t.dot)} />)}
      {children}
    </span>
  );
}

export type StockLevel = 'out' | 'low' | 'ok';

export function stockLevel(p: { stockQuantity: number; lowStockThreshold: number; isLow?: boolean }): StockLevel {
  if (p.stockQuantity <= 0) return 'out';
  return (p.isLow ?? p.stockQuantity <= p.lowStockThreshold) ? 'low' : 'ok';
}

/** Text colour for a stock figure; always paired with a StockPill so meaning never rests on colour. */
export const stockFigureClass: Record<StockLevel, string> = {
  out: 'text-rose-700',
  low: 'text-amber-700',
  ok: 'text-foreground',
};

export function StockPill({ level, className }: { level: StockLevel; className?: string }) {
  if (level === 'out')
    return (
      <Pill tone="rose" className={className}>
        Out of stock
      </Pill>
    );
  if (level === 'low')
    return (
      <Pill tone="amber" className={className}>
        Low stock
      </Pill>
    );
  return null;
}

export function ActivePill({ active, className }: { active: boolean; className?: string }) {
  return active ? (
    <Pill tone="emerald" className={className}>
      Active
    </Pill>
  ) : (
    <Pill tone="zinc" className={className}>
      Inactive
    </Pill>
  );
}
