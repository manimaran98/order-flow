import { Skeleton } from '@/components/ui/skeleton';

const ROWS = ['w-2/5', 'w-1/3', 'w-1/2', 'w-2/5', 'w-1/3', 'w-1/2'];

/** Mirrors a typical screen: page header, then one panel of divided rows. */
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="mb-5 grid gap-2 md:mb-6">
        <Skeleton className="h-7 w-40 md:h-8" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
        <div className="flex items-center justify-between border-b px-4 py-3 md:px-5">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-16" />
        </div>
        <ul className="divide-y">
          {ROWS.map((w, i) => (
            <li key={i} className="flex items-center justify-between gap-4 px-4 py-3.5 md:px-5">
              <span className="grid min-w-0 flex-1 gap-2">
                <Skeleton className={`h-4 ${w}`} />
                <Skeleton className="h-3 w-24" />
              </span>
              <Skeleton className="h-4 w-20 shrink-0" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
