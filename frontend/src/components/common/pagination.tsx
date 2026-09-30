import Link from 'next/link';
import { Button } from '@/components/ui/button';
import type { Paginated } from '@/lib/types';

type Props = { meta: Paginated<unknown>['meta']; pathname: string; params: Record<string, string | undefined> };

export function Pagination({ meta, pathname, params }: Props) {
  if (meta.totalPages <= 1) return null;
  const href = (page: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set('page', String(page));
    return `${pathname}?${query}`;
  };
  const hasPrev = meta.page > 1;
  const hasNext = meta.page < meta.totalPages;
  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-2 py-4">
      {hasPrev ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(meta.page - 1)}>Previous</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Previous
        </Button>
      )}
      <span className="text-sm text-muted-foreground">
        Page {meta.page} of {meta.totalPages}
      </span>
      {hasNext ? (
        <Button asChild variant="outline" size="sm">
          <Link href={href(meta.page + 1)}>Next</Link>
        </Button>
      ) : (
        <Button variant="outline" size="sm" disabled>
          Next
        </Button>
      )}
    </nav>
  );
}
