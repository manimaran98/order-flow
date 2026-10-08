import { ChevronDown } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

type PanelProps = {
  title?: ReactNode;
  /** Heading id; generated when omitted. */
  id?: string;
  /** Right side of the header row: a link or button. */
  action?: ReactNode;
  /** Right side of the header row: quiet supporting text such as a count or an amount. */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** `aside` when the panel is a column of its own (e.g. a sticky summary). */
  as?: 'section' | 'aside';
};

/** A raised white panel with an optional header row; the one panel used across the app. */
export function Panel({ title, id, action, aside, children, className, as: Tag = 'section' }: PanelProps) {
  const generated = useId();
  const headingId = id ?? generated;
  return (
    <Tag aria-labelledby={title ? headingId : undefined} className={cn('h-fit overflow-hidden rounded-lg border bg-card', className)}>
      {title && (
        <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
          <h2 id={headingId} className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
            {title}
          </h2>
          {aside && <div className="text-[0.8125rem] text-muted-foreground">{aside}</div>}
          {action}
        </div>
      )}
      {children}
    </Tag>
  );
}

/** Key facts as a definition list: muted label, foreground value. */
export function Facts({ items }: { items: { label: string; value: ReactNode; numeric?: boolean }[] }) {
  return (
    <dl className="divide-y">
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-3 px-4 py-2.5 text-sm md:px-5">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className={cn('min-w-0 break-words', item.numeric && 'tabular')}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** An edit form folded into the page instead of a modal; opens in place. */
export function EditDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group h-fit overflow-hidden rounded-lg border bg-card">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-[0.9375rem] font-semibold tracking-[-0.01em] transition-colors duration-150 outline-none select-none hover:bg-surface focus-visible:ring-3 focus-visible:ring-ring/35 focus-visible:ring-inset md:px-5 [&::-webkit-details-marker]:hidden">
        {title}
        <ChevronDown aria-hidden className="size-4 text-muted-foreground transition-transform duration-200 ease-out group-open:rotate-180 motion-reduce:transition-none" />
      </summary>
      <div className="border-t">{children}</div>
    </details>
  );
}
