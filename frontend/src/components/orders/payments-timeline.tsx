import { MoneyText } from '@/components/common/money-text';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/dates';
import type { Payment } from '@/lib/types';

const METHOD_LABEL: Record<Payment['method'], string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', CARD: 'Card', OTHER: 'Other' };

export function PaymentsTimeline({ payments }: { payments: Payment[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments</CardTitle>
      </CardHeader>
      <CardContent>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet.</p>
        ) : (
          <ol className="grid gap-3">
            {payments.map((p) => (
              <li key={p.id} className="flex items-start justify-between gap-2 border-l-2 border-green-500 pl-3">
                <div>
                  <p className="text-sm font-medium">{METHOD_LABEL[p.method]}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(p.paidAt)}
                    {p.reference && ` · ${p.reference}`}
                  </p>
                </div>
                <MoneyText value={p.amount} className="font-medium" />
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
