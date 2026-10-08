'use client';

import { TriangleAlert } from 'lucide-react';
import { Logo } from '@/components/shell/logo';
import { Button } from '@/components/ui/button';

// Root boundary: renders inside the root layout but outside any group shell, so it brings its own frame.
export default function RootError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-surface px-4 pt-12 pb-10 sm:justify-center">
      <div className="grid w-full max-w-[400px] gap-8">
        <Logo className="justify-center" />
        <section className="flex flex-col items-center rounded-lg border bg-card px-6 py-10 text-center shadow-sm">
          <span className="mb-4 grid size-10 place-items-center rounded-full border bg-background text-amber-600 shadow-xs">
            <TriangleAlert aria-hidden className="size-[1.125rem]" />
          </span>
          <h1 className="text-[0.9375rem] font-semibold">OrderFlow could not load this page.</h1>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">Check your connection, then try again.</p>
          <Button onClick={() => retry()} className="mt-5">
            Try again
          </Button>
        </section>
      </div>
    </main>
  );
}
