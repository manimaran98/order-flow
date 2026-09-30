import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { StockRow } from '@/lib/types';

export function LowStockList({ items }: { items: StockRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Low stock</CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">Everything is above its low-stock level.</p>
        ) : (
          <ul className="divide-y">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2">
                <Link href={`/products/${p.id}`} className="underline-offset-4 hover:underline">
                  {p.name}
                  <span className="ml-2 text-xs text-muted-foreground">{p.sku}</span>
                </Link>
                <span className="text-sm tabular-nums">
                  <span className="font-semibold text-amber-700">{p.stockQuantity}</span>
                  <span className="text-muted-foreground"> / {p.lowStockThreshold}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
