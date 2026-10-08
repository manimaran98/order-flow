import Link from 'next/link';
import { BottomNav } from '@/components/shell/bottom-nav';
import { Logo } from '@/components/shell/logo';
import { LogoutButton } from '@/components/shell/logout-button';
import { NavLinks } from '@/components/shell/nav-links';
import { Avatar } from '@/components/shell/user-badge';
import { getCurrentUser } from '@/lib/current-user';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const role = user.role === 'ADMIN' ? 'Admin' : 'Staff';
  return (
    <div className="min-h-dvh md:flex">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="rounded-md">
            <Logo />
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <NavLinks role={user.role} />
        </div>
        <div className="grid gap-3 border-t p-3">
          <div className="flex items-center gap-2.5 px-1">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{role}</p>
            </div>
          </div>
          <LogoutButton className="w-full" />
        </div>
      </aside>
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85 md:hidden">
        <Link href="/dashboard" className="rounded-md">
          <Logo />
        </Link>
        <span className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="sr-only">Signed in as</span>
          <Avatar name={user.name} className="size-7" />
          <span className="max-w-[9rem] truncate">{user.name}</span>
        </span>
      </header>
      <main className="min-w-0 flex-1 px-4 pt-5 pb-28 md:px-8 md:pt-8 md:pb-12">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
      <BottomNav role={user.role} />
    </div>
  );
}
