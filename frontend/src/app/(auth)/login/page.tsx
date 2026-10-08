import { Clock } from 'lucide-react';
import Link from 'next/link';
import { login } from '@/actions/auth';
import { AuthPanel, authLinkClass } from '@/components/auth/auth-panel';
import { LoginForm } from '@/components/auth/login-form';
import { safeNext } from '@/lib/safe-next';

export const metadata = { title: 'Log in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; expired?: string }> }) {
  const { next, expired } = await searchParams;
  return (
    <AuthPanel
      title="Log in to OrderFlow"
      description="Orders, stock and payments in one place."
      footer={
        <>
          Setting up a new business?{' '}
          <Link href="/register" className={authLinkClass}>
            Create the first account
          </Link>
        </>
      }
    >
      {expired && (
        <p role="status" className="flex items-start gap-2.5 rounded-md border border-amber-600/20 bg-amber-50 px-3 py-2.5 text-sm text-amber-900">
          <Clock aria-hidden className="mt-0.5 size-4 shrink-0 text-amber-600" />
          Your session has ended. Please log in again.
        </p>
      )}
      <LoginForm action={login} next={safeNext(next)} />
    </AuthPanel>
  );
}
