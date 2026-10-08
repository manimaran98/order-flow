import { cn } from '@/lib/utils';

/** OrderFlow mark: an order's path, in and through to delivered. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={cn('size-6 shrink-0', className)}>
      <rect width="24" height="24" rx="6" className="fill-primary" />
      <path
        d="M6 5.75h8.25a2.875 2.875 0 0 1 0 5.75h-4.5a2.875 2.875 0 0 0 0 5.75H17.5M15.25 15 17.5 17.25 15.25 19.5"
        fill="none"
        stroke="white"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 text-[0.9375rem] leading-none font-semibold tracking-[-0.01em]', className)}>
      <LogoMark />
      OrderFlow
    </span>
  );
}
