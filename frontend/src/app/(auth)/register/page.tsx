import Link from 'next/link';
import { register } from '@/actions/auth';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata = { title: 'Create account' };

export default function RegisterPage() {
  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-xl font-semibold">Create the first account</h1>
        <p className="text-sm text-muted-foreground">The first person to register becomes the admin. After that, admins add staff.</p>
      </div>
      <RegisterForm action={register} />
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
