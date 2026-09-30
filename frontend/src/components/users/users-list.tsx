import { Badge } from '@/components/ui/badge';
import type { User } from '@/lib/types';
import { UserActions } from './user-actions';

export function UsersList({ users, currentUserId }: { users: User[]; currentUserId: string }) {
  return (
    <ul className="divide-y rounded-lg border">
      {users.map((u) => (
        <li key={u.id} className="grid gap-2 p-3 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="font-medium">
              {u.name}
              {u.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}
            </p>
            <p className="text-sm text-muted-foreground">{u.email}</p>
            <div className="mt-1 flex gap-1">
              <Badge variant="outline">{u.role === 'ADMIN' ? 'Admin' : 'Staff'}</Badge>
              {!u.isActive && (
                <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-600">
                  Inactive
                </Badge>
              )}
            </div>
          </div>
          <UserActions user={u} isSelf={u.id === currentUserId} />
        </li>
      ))}
    </ul>
  );
}
