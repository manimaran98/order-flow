import Link from 'next/link';
import { login } from '@/actions/auth';
import { LoginForm } from '@/components/auth/login-form';
import { safeNext } from '@/lib/safe-next';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next, expired } = await searchParams;
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold">Log in to OrderFlow</h1>
        <p className="text-sm text-muted-foreground">Orders, stock and payments in one place.</p>
      </div>
      {expired && (
        <p role="status" className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your session has ended. Please log in again.
        </p>
      )}
      <LoginForm action={login} next={safeNext(next)} />
      <p className="text-sm text-muted-foreground">
        Setting up a new business?{' '}
        <Link href="/register" className="font-medium text-foreground underline-offset-4 hover:underline">
          Create the first account
        </Link>
      </p>
    </div>
  );
}
