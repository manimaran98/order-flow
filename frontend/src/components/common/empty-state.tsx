import { Inbox, Lock, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type Props = { title: string; description?: string; action?: ReactNode; icon?: LucideIcon; className?: string };

export function EmptyState({ title, description, action, icon: Icon = Inbox, className }: Props) {
  return (
    <div className={cn('flex flex-col items-center rounded-lg border bg-surface px-6 py-12 text-center', className)}>
      <span className="mb-4 grid size-10 place-items-center rounded-full border bg-background text-muted-foreground">
        <Icon aria-hidden className="size-[1.125rem]" />
      </span>
      <p className="text-[0.9375rem] font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground text-pretty">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function AdminOnly() {
  return <EmptyState icon={Lock} title="Admins only" description="Ask an admin if you need access to this page." />;
}
