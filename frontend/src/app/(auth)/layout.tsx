import { Logo } from '@/components/shell/logo';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center bg-surface px-4 pt-12 pb-10 sm:justify-center sm:pt-10">
      <div className="grid w-full max-w-[400px] gap-8">
        <Logo className="justify-center text-base [&_svg]:size-7" />
        {children}
      </div>
    </main>
  );
}
