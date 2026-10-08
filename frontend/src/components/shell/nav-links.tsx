'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { activeHref, navFor } from './nav';

export function NavLinks({ role }: { role: Role }) {
  const pathname = usePathname();
  const items = navFor(role);
  const active = activeHref(pathname, items);
  return (
    <nav aria-label="Main" className="grid gap-0.5">
      {items.map(({ href, label, icon: Icon }) => {
        const current = href === active;
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={cn(
              'group flex h-8 items-center gap-2.5 rounded-md px-2.5 text-sm text-muted-foreground transition-colors duration-150 hover:bg-sidebar-accent hover:text-foreground',
              current && 'bg-background font-medium text-foreground shadow-xs ring-1 ring-border hover:bg-background',
            )}
          >
            <Icon aria-hidden className={cn('size-4 text-muted-foreground transition-colors group-hover:text-foreground', current && 'text-primary group-hover:text-primary')} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
