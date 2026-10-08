import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { StockRow } from '@/lib/types';
import { cn } from '@/lib/utils';
import { AdjustStockDialog } from './adjust-stock';
import { Pill, StockPill, stockFigureClass, stockLevel } from '@/components/common/pill';

export function StockList({ rows, isAdmin }: { rows: StockRow[]; isAdmin: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <ul className="divide-y md:hidden">
        {rows.map((r) => {
          const level = stockLevel(r);
          return (
            <li key={r.id} className="flex items-center gap-3 py-3 pr-3 pl-4">
              <div className="grid min-w-0 flex-1 gap-1">
                <Link href={`/products/${r.id}`} className={cn('line-clamp-2 text-sm font-medium', !r.isActive && 'text-muted-foreground')}>
                  {r.name}
                </Link>
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-xs text-muted-foreground">{r.sku}</span>
                  {!r.isActive && <Pill tone="zinc">Inactive</Pill>}
                  <StockPill level={level} />
                </span>
              </div>
              <div className="tabular shrink-0 text-right">
                <span data-testid={`stock-${r.sku}`} className={cn('block text-lg leading-6 font-semibold', stockFigureClass[level])}>
                  {r.stockQuantity}
                </span>
                <span className="block text-xs text-muted-foreground">reorder at {r.lowStockThreshold}</span>
              </div>
              {isAdmin && <AdjustStockDialog product={r} />}
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
              <TableHead className="text-right">In stock</TableHead>
              <TableHead className="text-right">Reorder at</TableHead>
              <TableHead>Level</TableHead>
              {isAdmin && (
                <TableHead>
                  <span className="sr-only">Actions</span>
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => {
              const level = stockLevel(r);
              return (
                <TableRow key={r.id}>
                  <TableCell className="max-w-[22rem] truncate">
                    <Link
                      href={`/products/${r.id}`}
                      className={cn('font-medium underline-offset-4 hover:text-primary hover:underline', r.isActive ? 'text-foreground' : 'text-muted-foreground')}
                    >
                      {r.name}
                    </Link>
                    {!r.isActive && <Pill tone="zinc" className="ml-2">Inactive</Pill>}
                  </TableCell>
                  <TableCell className="font-mono text-[0.8125rem] text-muted-foreground">{r.sku}</TableCell>
                  <TableCell className="text-right">
                    <span data-testid={`stock-${r.sku}`} className={cn('font-semibold', stockFigureClass[level])}>
                      {r.stockQuantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground">{r.lowStockThreshold}</TableCell>
                  <TableCell>{level === 'ok' ? <span className="text-[0.8125rem] text-muted-foreground">OK</span> : <StockPill level={level} />}</TableCell>
                  {isAdmin && (
                    <TableCell className="w-0 text-right">
                      <AdjustStockDialog product={r} />
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
