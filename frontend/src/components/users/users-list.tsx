import { ShieldCheck } from 'lucide-react';
import { Pill } from '@/components/common/pill';
import { Avatar } from '@/components/shell/user-badge';
import type { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { UserActions } from './user-actions';

export function UsersList({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  return (
    <section aria-labelledby="team-heading" className="h-fit overflow-hidden rounded-lg border bg-card">
      <div className="flex min-h-12 items-center justify-between gap-3 border-b px-4 py-3 md:px-5">
        <h2 id="team-heading" className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
          Team
        </h2>
        <span className="tabular text-[0.8125rem] text-muted-foreground">{users.length === 1 ? '1 user' : `${users.length} users`}</span>
      </div>
      <ul className="divide-y">
        {users.map((u) => {
          const isSelf = u.id === currentUserId;
          return (
            <li key={u.id} className="grid gap-3 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:px-5">
              <div className="flex min-w-0 items-start gap-3">
                <Avatar name={u.name} className={cn('mt-0.5', !u.isActive && 'bg-zinc-100 text-zinc-500')} />
                <div className="grid min-w-0 gap-1">
                  <p className={cn('truncate text-sm font-medium', !u.isActive && 'text-muted-foreground')}>
                    {u.name}
                    {isSelf && <span className="ml-1.5 text-xs font-normal text-muted-foreground">(you)</span>}
                  </p>
                  <p className="truncate text-[0.8125rem] text-muted-foreground">{u.email}</p>
                  <div className="mt-0.5 flex flex-wrap gap-1.5">
                    {u.role === 'ADMIN' ? (
                      <Pill tone="neutral" icon={<ShieldCheck aria-hidden className="size-3.5 text-zinc-500" />}>
                        Admin
                      </Pill>
                    ) : (
                      <Pill tone="neutral" dot={false}>
                        Staff
                      </Pill>
                    )}
                    {u.isActive ? <Pill tone="emerald">Active</Pill> : <Pill tone="zinc">Deactivated</Pill>}
                  </div>
                </div>
              </div>
              <div>
                <UserActions user={u} isSelf={isSelf} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
