import Link from 'next/link';
import { register } from '@/actions/auth';
import { AuthPanel, authLinkClass } from '@/components/auth/auth-panel';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <AuthPanel
      title="Create the first account"
      description="The first person to register becomes the admin. After that, admins add staff."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className={authLinkClass}>
            Log in
          </Link>
        </>
      }
    >
      <RegisterForm action={register} />
    </AuthPanel>
  );
}
