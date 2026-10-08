'use client';

import { TriangleAlert } from 'lucide-react';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

export default function AppError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <EmptyState
      icon={TriangleAlert}
      title="Something went wrong"
      description={error.message || 'Please try again.'}
      className="bg-card"
      action={<Button onClick={() => retry()}>Try again</Button>}
    />
  );
}
