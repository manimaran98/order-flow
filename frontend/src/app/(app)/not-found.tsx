import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-8 text-center">
      <p className="font-medium">We couldn&apos;t find that</p>
      <p className="text-sm text-muted-foreground">It may have been deleted, or the link is wrong.</p>
      <Button asChild variant="outline">
        <Link href="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
