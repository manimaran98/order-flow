import { LogOut } from 'lucide-react';
import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton({ className, variant = 'outline' }: { className?: string; variant?: 'outline' | 'ghost' }) {
  return (
    <form action={logout}>
      <Button type="submit" variant={variant} size="sm" className={className}>
        <LogOut aria-hidden data-icon="inline-start" />
        Log out
      </Button>
    </form>
  );
}
