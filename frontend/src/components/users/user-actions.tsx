'use client';

import { useId, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { updateUser } from '@/actions/users';
import { selectClass } from '@/components/common/field';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Role, User } from '@/lib/types';
import { cn } from '@/lib/utils';

export function UserActions({ user, isSelf }: { user: User; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const roleId = useId();
  const save = (patch: { role?: Role; isActive?: boolean; password?: string }, message: string) =>
    startTransition(async () => {
      const r = await updateUser(user.id, patch);
      if (r.ok) toast.success(message);
      else toast.error(r.error);
    });
  return (
    <div className="flex flex-wrap items-center gap-2 md:justify-end">
      <Label htmlFor={roleId} className="sr-only">
        Role for {user.name}
      </Label>
      <select
        id={roleId}
        className={cn(selectClass, 'w-24 md:h-8 md:w-28 md:text-[0.8125rem]')}
        value={user.role}
        disabled={isSelf || pending}
        onChange={(e) => save({ role: e.target.value as Role }, 'Role updated')}
      >
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
      </select>
      <Button
        variant="outline"
        size="sm"
        className="h-10 md:h-8"
        disabled={isSelf || pending}
        onClick={() => save({ isActive: !user.isActive }, user.isActive ? 'User deactivated' : 'User activated')}
      >
        {user.isActive ? 'Deactivate' : 'Activate'}
      </Button>
      <ResetPassword user={user} onSave={(password) => save({ password }, 'Password reset')} />
    </div>
  );
}

function ResetPassword({ user, onSave }: { user: User; onSave: (password: string) => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const id = useId();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 md:h-8">
          Reset password
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset password</DialogTitle>
          <DialogDescription>Set a new password for {user.name}. Share it with them privately.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-1.5">
          <Label htmlFor={id}>New password</Label>
          <Input id={id} type="password" minLength={8} maxLength={72} value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <DialogFooter>
          <Button
            disabled={password.length < 8}
            onClick={() => {
              onSave(password);
              setPassword('');
              setOpen(false);
            }}
          >
            Save password
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
