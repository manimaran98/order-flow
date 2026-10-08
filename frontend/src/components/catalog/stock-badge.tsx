import { cn } from '@/lib/utils';

// Same pill as StatusBadge: a dot in the hue, the label carries the meaning.
const pill = 'inline-flex h-[1.375rem] shrink-0 items-center gap-1.5 rounded-full px-2 text-xs font-medium whitespace-nowrap ring-1 ring-inset';

export function StockBadge({ inStock, className }: { inStock: boolean; className?: string }) {
  return inStock ? (
    <span data-stock="in" className={cn(pill, 'bg-emerald-50 text-emerald-800 ring-emerald-600/20', className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-emerald-500" />
      In stock
    </span>
  ) : (
    <span data-stock="out" className={cn(pill, 'bg-zinc-100 text-zinc-600 ring-zinc-500/20', className)}>
      <span aria-hidden className="size-1.5 rounded-full bg-zinc-400" />
      Out of stock
    </span>
  );
}
