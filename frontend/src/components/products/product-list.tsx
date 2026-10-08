import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { MoneyText } from '@/components/common/money-text';
import { Pill, StockPill, stockFigureClass, stockLevel } from '@/components/common/pill';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Product } from '@/lib/types';
import { cn } from '@/lib/utils';

export function ProductList({ products }: { products: Product[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <ul className="divide-y md:hidden">
        {products.map((p) => {
          const level = stockLevel(p);
          return (
            <li key={p.id}>
              <Link href={`/products/${p.id}`} className="flex min-h-16 items-center gap-3 px-4 py-3 transition-colors duration-150 active:bg-surface">
                <span className="grid min-w-0 flex-1 gap-1">
                  <span className={cn('truncate text-sm font-medium', !p.isActive && 'text-muted-foreground')}>{p.name}</span>
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span className="font-mono text-xs text-muted-foreground">{p.sku}</span>
                    {!p.isActive && <Pill tone="zinc">Inactive</Pill>}
                    <StockPill level={level} />
                  </span>
                </span>
                <span className="tabular grid shrink-0 justify-items-end gap-1 text-right">
                  <MoneyText value={p.sellingPrice} className="text-sm font-semibold" />
                  <span className={cn('text-xs', level === 'ok' ? 'text-muted-foreground' : cn('font-medium', stockFigureClass[level]))}>{p.stockQuantity} in stock</span>
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          );
        })}
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
            {products.map((p) => {
              const level = stockLevel(p);
              return (
                <TableRow key={p.id} className="relative">
                  <TableCell className="max-w-[22rem] truncate">
                    <Link
                      href={`/products/${p.id}`}
                      className={cn(
                        'font-medium outline-none after:absolute after:inset-0 hover:text-primary focus-visible:after:ring-3 focus-visible:after:ring-ring/35 focus-visible:after:ring-inset',
                        p.isActive ? 'text-foreground' : 'text-muted-foreground',
                      )}
                    >
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="text-right">
                    <MoneyText value={p.sellingPrice} />
                  </TableCell>
                  <TableCell className={cn('text-right font-medium', stockFigureClass[level])}>{p.stockQuantity}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-1.5">
                      {!p.isActive && <Pill tone="zinc">Inactive</Pill>}
                      <StockPill level={level} />
                      {p.isActive && level === 'ok' && <span className="text-[0.8125rem] text-muted-foreground">Active</span>}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
