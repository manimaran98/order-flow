import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function CatalogNotFound() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-card p-8 text-center">
      <p className="font-medium">This product isn&apos;t available</p>
      <p className="text-sm text-muted-foreground">It may no longer be sold, or the link is wrong.</p>
      <Button asChild variant="outline">
        <Link href="/catalog">See all products</Link>
      </Button>
    </div>
  );
}
