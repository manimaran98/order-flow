import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dates';
import type { InventoryTransaction } from '@/lib/types';
import { cn } from '@/lib/utils';

const TYPE_LABEL: Record<InventoryTransaction['type'], string> = {
  SALE: 'Sale',
  RESTOCK: 'Restock',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Returned (cancelled order)',
};

/** Signed change with a real minus sign, coloured by direction; the sign carries the meaning too. */
function Change({ quantity, className }: { quantity: number; className?: string }) {
  return (
    <span className={cn('tabular font-medium whitespace-nowrap', quantity < 0 ? 'text-rose-700' : 'text-emerald-700', className)}>
      {quantity > 0 ? `+${quantity}` : quantity < 0 ? `−${Math.abs(quantity)}` : '0'}
    </span>
  );
}

export function StockLedger({ rows }: { rows: InventoryTransaction[] }) {
  if (rows.length === 0) return <p className="px-4 py-10 text-center text-sm text-muted-foreground md:px-5">No stock movements yet.</p>;
  return (
    <>
      <div className="hidden md:block md:[&_td:first-child]:pl-5 md:[&_th:first-child]:pl-5 md:[&_td:last-child]:pr-5 md:[&_th:last-child]:pr-5">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>When</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Change</TableHead>
              <TableHead>Note</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="text-muted-foreground">{formatDateTime(t.createdAt)}</TableCell>
                <TableCell>{TYPE_LABEL[t.type]}</TableCell>
                <TableCell className="text-right">
                  <Change quantity={t.quantity} />
                </TableCell>
                <TableCell className="max-w-[18rem] truncate text-muted-foreground" title={t.note ?? undefined}>
                  {t.note || '—'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <ul className="divide-y md:hidden">
        {rows.map((t) => (
          <li key={t.id} className="flex items-start justify-between gap-3 px-4 py-3">
            <span className="grid min-w-0 gap-0.5">
              <span className="text-sm font-medium">{TYPE_LABEL[t.type]}</span>
              <span className="tabular text-xs text-muted-foreground">{formatDateTime(t.createdAt)}</span>
              {t.note && <span className="text-[0.8125rem] text-muted-foreground">{t.note}</span>}
            </span>
            <Change quantity={t.quantity} className="text-[0.9375rem]" />
          </li>
        ))}
      </ul>
    </>
  );
}
