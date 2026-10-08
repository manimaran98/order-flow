import Link from 'next/link';
import { Logo } from '@/components/shell/logo';

/**
 * Customer-facing pages: no login, no app shell. Must stay free of cookies()/headers()
 * so the pages below remain statically generated.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-surface">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/85">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4 md:px-8">
          <Link
            href="/catalog"
            className="flex rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/35"
            aria-label="OrderFlow catalog, all products"
          >
            <Logo />
          </Link>
          <span aria-hidden className="h-4 w-px bg-border" />
          <span className="text-sm text-muted-foreground">Catalog</span>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-4 pt-5 pb-12 md:px-8 md:pt-8">{children}</main>
    </div>
  );
}
