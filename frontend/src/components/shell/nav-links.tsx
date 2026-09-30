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
    <nav aria-label="Main" className="grid gap-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={href === active ? 'page' : undefined}
          className={cn('flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted', href === active && 'bg-muted font-medium')}
        >
          <Icon className="size-4" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
