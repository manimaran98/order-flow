import { Badge } from '@/components/ui/badge';

export function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <Badge variant="outline" className="border-green-300 bg-green-50 text-green-800">
      In stock
    </Badge>
  ) : (
    <Badge variant="outline" className="border-zinc-300 bg-zinc-100 text-zinc-600">
      Out of stock
    </Badge>
  );
}
