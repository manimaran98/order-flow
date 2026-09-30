'use client';

import { Boxes, ClipboardList, Ellipsis, LayoutDashboard, Plus } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import type { Role } from '@/lib/types';
import { cn } from '@/lib/utils';
import { LogoutButton } from './logout-button';
import { activeHref, navFor } from './nav';

const TABS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/orders/new', label: 'New', icon: Plus },
  { href: '/inventory', label: 'Stock', icon: Boxes },
];
const MORE = ['/products', '/customers', '/users'];

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const active = activeHref(pathname, TABS);
  return (
    <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 grid h-14 grid-cols-5 border-t bg-background md:hidden">
      {TABS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={href === active ? 'page' : undefined}
          className={cn('flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground', href === active && 'text-foreground font-medium')}
        >
          <Icon className="size-5" />
          {label}
        </Link>
      ))}
      <Sheet>
        <SheetTrigger className="flex flex-col items-center justify-center gap-0.5 text-xs text-muted-foreground">
          <Ellipsis className="size-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1 px-4 pb-6">
            {navFor(role)
              .filter((item) => MORE.includes(item.href))
              .map(({ href, label, icon: Icon }) => (
                <SheetClose asChild key={href}>
                  <Link href={href} className="flex items-center gap-3 rounded-md px-3 py-3 hover:bg-muted">
                    <Icon className="size-5" />
                    {label}
                  </Link>
                </SheetClose>
              ))}
            <LogoutButton className="mt-2 h-11 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
