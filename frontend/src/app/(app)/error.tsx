'use client';

import { Button } from '@/components/ui/button';

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">Something went wrong</p>
      <p className="max-w-md text-sm text-muted-foreground">{error.message || 'Please try again.'}</p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}
