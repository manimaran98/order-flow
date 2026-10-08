import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <EmptyState
      icon={SearchX}
      title="We couldn’t find that"
      description="It may have been deleted, or the link is wrong."
      className="bg-card"
      action={
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      }
    />
  );
}
