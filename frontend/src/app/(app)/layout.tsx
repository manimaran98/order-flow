import Link from 'next/link';
import { BottomNav } from '@/components/shell/bottom-nav';
import { LogoutButton } from '@/components/shell/logout-button';
import { NavLinks } from '@/components/shell/nav-links';
import { getCurrentUser } from '@/lib/current-user';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-muted/30 p-4 md:flex">
        <Link href="/dashboard" className="text-lg font-semibold">
          OrderFlow
        </Link>
        <NavLinks role={user.role} />
        <div className="mt-auto grid gap-2 text-sm">
          <div>
            <p className="font-medium">{user.name}</p>
            <p className="text-muted-foreground">{user.role === 'ADMIN' ? 'Admin' : 'Staff'}</p>
          </div>
          <LogoutButton className="w-full" />
        </div>
      </aside>
      <header className="sticky top-0 z-10 flex h-12 items-center justify-between border-b bg-background px-4 md:hidden">
        <Link href="/dashboard" className="font-semibold">
          OrderFlow
        </Link>
        <span className="text-sm text-muted-foreground">{user.name}</span>
      </header>
      <main className="min-w-0 flex-1 px-4 pb-24 pt-4 md:px-8 md:pb-10 md:pt-6">{children}</main>
      <BottomNav role={user.role} />
    </div>
  );
}
