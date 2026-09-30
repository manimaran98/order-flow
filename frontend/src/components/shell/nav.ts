import { Boxes, ClipboardList, LayoutDashboard, Package, Plus, UserCog, Users, type LucideIcon } from 'lucide-react';
import type { Role } from '@/lib/types';

export type NavItem = { href: string; label: string; icon: LucideIcon; adminOnly?: boolean };

export const NAV: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/orders', label: 'Orders', icon: ClipboardList },
  { href: '/orders/new', label: 'New order', icon: Plus },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/users', label: 'Users', icon: UserCog, adminOnly: true },
];

export const navFor = (role: Role) => NAV.filter((item) => !item.adminOnly || role === 'ADMIN');

/** Longest matching prefix wins, so /orders/new highlights "New order", not "Orders". */
export function activeHref(pathname: string, items: { href: string }[] = NAV): string | undefined {
  return items
    .map((i) => i.href)
    .filter((href) => pathname === href || pathname.startsWith(`${href}/`))
    .sort((a, b) => b.length - a.length)[0];
}
