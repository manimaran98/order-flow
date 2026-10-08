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

const tab = 'flex flex-col items-center justify-center gap-1 text-[0.6875rem] font-medium text-muted-foreground transition-colors';

export function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const active = activeHref(pathname, TABS);
  const moreActive = MORE.some((href) => pathname === href || pathname.startsWith(`${href}/`));
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-sm supports-[backdrop-filter]:bg-background/85 md:hidden"
    >
      {TABS.map(({ href, label, icon: Icon }) => {
        const current = href === active;
        if (href === '/orders/new') {
          return (
            <Link key={href} href={href} aria-current={current ? 'page' : undefined} className={cn(tab, 'h-16 text-foreground')}>
              <span className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
                <Icon aria-hidden className="size-5" />
              </span>
              {label}
            </Link>
          );
        }
        return (
          <Link key={href} href={href} aria-current={current ? 'page' : undefined} className={cn(tab, 'h-16', current && 'text-primary')}>
            <Icon aria-hidden className="size-5" strokeWidth={current ? 2.25 : 2} />
            {label}
          </Link>
        );
      })}
      <Sheet>
        <SheetTrigger className={cn(tab, 'h-16', moreActive && 'text-primary')}>
          <Ellipsis aria-hidden className="size-5" />
          More
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-xl pb-[env(safe-area-inset-bottom)]">
          <SheetHeader>
            <SheetTitle>More</SheetTitle>
          </SheetHeader>
          <div className="grid gap-1 px-4 pb-6">
            {navFor(role)
              .filter((item) => MORE.includes(item.href))
              .map(({ href, label, icon: Icon }) => (
                <SheetClose asChild key={href}>
                  <Link href={href} className="flex h-12 items-center gap-3 rounded-md px-3 text-[0.9375rem] font-medium hover:bg-accent">
                    <Icon aria-hidden className="size-5 text-muted-foreground" />
                    {label}
                  </Link>
                </SheetClose>
              ))}
            <LogoutButton className="mt-3 h-11 w-full" />
          </div>
        </SheetContent>
      </Sheet>
    </nav>
  );
}
