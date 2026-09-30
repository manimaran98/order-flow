import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Product } from '@/lib/types';

const low = (p: Product) => p.stockQuantity <= p.lowStockThreshold;

export function ProductList({ products }: { products: Product[] }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/products/${p.id}`} className="flex items-center justify-between rounded-lg border bg-card p-3">
              <span>
                <span className="font-medium">{p.name}</span>
                <span className="block text-xs text-muted-foreground">
                  {p.sku}
                  {!p.isActive && ' · inactive'}
                </span>
              </span>
              <span className="text-right">
                <MoneyText value={p.sellingPrice} className="block font-medium" />
                <span className={low(p) ? 'text-xs text-amber-700' : 'text-xs text-muted-foreground'}>{p.stockQuantity} in stock</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Price</TableHead>
              <TableHead className="text-right">In stock</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <Link href={`/products/${p.id}`} className="font-medium underline-offset-4 hover:underline">
                    {p.name}
                  </Link>
                </TableCell>
                <TableCell>{p.sku}</TableCell>
                <TableCell className="text-right">
                  <MoneyText value={p.sellingPrice} />
                </TableCell>
                <TableCell className={low(p) ? 'text-right font-semibold text-amber-700' : 'text-right'}>{p.stockQuantity}</TableCell>
                <TableCell>
                  <Badge variant="outline">{p.isActive ? 'Active' : 'Inactive'}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
