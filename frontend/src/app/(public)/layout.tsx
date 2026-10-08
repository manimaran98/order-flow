import Link from 'next/link';

/**
 * Customer-facing pages: no login, no app shell. Must stay free of cookies()/headers()
 * so the pages below remain statically generated.
 */
export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/40">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center px-4 md:h-14 md:px-8">
          <Link href="/catalog" className="font-semibold">
            Product catalog
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-10 pt-4 md:px-8 md:pt-6">{children}</main>
    </div>
  );
}
