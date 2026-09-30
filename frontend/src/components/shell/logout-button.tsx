import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';

export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" size="sm" className={className}>
        Log out
      </Button>
    </form>
  );
}
