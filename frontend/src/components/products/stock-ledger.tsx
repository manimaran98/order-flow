import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDateTime } from '@/lib/dates';
import type { InventoryTransaction } from '@/lib/types';

const TYPE_LABEL: Record<InventoryTransaction['type'], string> = {
  SALE: 'Sale',
  RESTOCK: 'Restock',
  ADJUSTMENT: 'Adjustment',
  RETURN: 'Returned (cancelled order)',
};

export function StockLedger({ rows }: { rows: InventoryTransaction[] }) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">No stock movements yet.</p>;
  return (
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
            <TableCell className="whitespace-nowrap">{formatDateTime(t.createdAt)}</TableCell>
            <TableCell>{TYPE_LABEL[t.type]}</TableCell>
            <TableCell className={t.quantity < 0 ? 'text-right tabular-nums text-red-700' : 'text-right tabular-nums text-green-700'}>
              {t.quantity > 0 ? `+${t.quantity}` : t.quantity}
            </TableCell>
            <TableCell className="text-muted-foreground">{t.note}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
