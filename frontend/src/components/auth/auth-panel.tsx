import type { ReactNode } from 'react';

/** The single white panel of the auth screens, with the secondary link set below it. */
export function AuthPanel({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <section aria-labelledby="auth-title" className="grid gap-6 rounded-lg border bg-card p-6 shadow-sm sm:p-8">
        <header className="grid gap-1.5">
          <h1 id="auth-title" className="text-xl font-semibold tracking-[-0.02em] text-balance">
            {title}
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">{description}</p>
        </header>
        {children}
      </section>
      <p className="text-center text-sm text-muted-foreground">{footer}</p>
    </div>
  );
}

export const authLinkClass =
  'rounded-sm font-medium text-primary underline-offset-4 transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/35';
