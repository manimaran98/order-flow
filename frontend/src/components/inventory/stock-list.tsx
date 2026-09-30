import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StockRow } from '@/lib/types';
import { AdjustStockDialog } from './adjust-stock';

const isLow = (r: StockRow) => r.isLow ?? r.stockQuantity <= r.lowStockThreshold;

function LowBadge() {
  return (
    <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800">
      Low
    </Badge>
  );
}

export function StockList({ rows, isAdmin }: { rows: StockRow[]; isAdmin: boolean }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-2 rounded-lg border bg-card p-3">
            <div className="min-w-0">
              <Link href={`/products/${r.id}`} className="font-medium">
                {r.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {r.sku} · low at {r.lowStockThreshold}
                {!r.isActive && ' · inactive'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isLow(r) && <LowBadge />}
              <span data-testid={`stock-${r.sku}`} className="text-lg font-semibold tabular-nums">
                {r.stockQuantity}
              </span>
              {isAdmin && <AdjustStockDialog product={r} />}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              <TableHead className="text-right">Low at</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/products/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                    {r.name}
                  </Link>
                  {!r.isActive && <span className="ml-2 text-xs text-muted-foreground">inactive</span>}
                </TableCell>
                <TableCell>{r.sku}</TableCell>
                <TableCell className="text-right">
                  <span className="inline-flex items-center gap-2">
                    {isLow(r) && <LowBadge />}
                    <span data-testid={`stock-${r.sku}`} className="font-semibold tabular-nums">
                      {r.stockQuantity}
                    </span>
                  </span>
                </TableCell>
                <TableCell className="text-right tabular-nums">{r.lowStockThreshold}</TableCell>
                <TableCell className="text-right">{isAdmin && <AdjustStockDialog product={r} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
