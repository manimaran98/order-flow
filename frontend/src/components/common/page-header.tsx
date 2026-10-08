import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Parent page for detail and form screens, e.g. { href: '/orders', label: 'Orders' }. */
  back?: { href: string; label: string };
  /** Inline next to the title, e.g. status pills. */
  meta?: ReactNode;
};

export function PageHeader({ title, description, actions, back, meta }: Props) {
  return (
    <div className="mb-5 grid gap-3 md:mb-6">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 inline-flex w-fit items-center gap-0.5 rounded-md px-1 text-[0.8125rem] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft aria-hidden className="size-4" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="grid min-w-0 gap-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <h1 className="text-xl font-semibold tracking-[-0.02em] text-balance md:text-2xl">{title}</h1>
            {meta && <div className="flex flex-wrap items-center gap-1.5">{meta}</div>}
          </div>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}
