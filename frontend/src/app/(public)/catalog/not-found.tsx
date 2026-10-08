import { PackageX } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/common/empty-state';
import { Button } from '@/components/ui/button';

export default function CatalogNotFound() {
  return (
    <EmptyState
      icon={PackageX}
      title="This product isn’t available"
      description="It may no longer be sold, or the link is wrong."
      className="bg-card shadow-xs"
      action={
        <Button asChild variant="outline">
          <Link href="/catalog">See all products</Link>
        </Button>
      }
    />
  );
}
