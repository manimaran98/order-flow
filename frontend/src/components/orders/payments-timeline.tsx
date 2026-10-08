import { MoneyText } from '@/components/common/money-text';
import { formatDate } from '@/lib/dates';
import type { Payment } from '@/lib/types';

const METHOD_LABEL: Record<Payment['method'], string> = { CASH: 'Cash', BANK_TRANSFER: 'Bank transfer', CARD: 'Card', OTHER: 'Other' };

/** Payment history as a quiet timeline: a hairline rail with one dot per payment. Sits inside a Panel. */
export function PaymentsTimeline({ payments }: { payments: Payment[] }) {
  if (payments.length === 0) {
    return <p className="px-4 py-4 text-sm text-muted-foreground md:px-5">No payments yet.</p>;
  }
  return (
    <ol aria-label="Payment history" className="px-4 py-4 md:px-5">
      {payments.map((p, i) => (
        <li key={p.id} className="relative flex items-start gap-3 pb-4 last:pb-0">
          {i < payments.length - 1 && <span aria-hidden className="absolute top-4 bottom-0 left-[0.3125rem] w-px bg-border" />}
          <span aria-hidden className="relative mt-1.5 size-2.5 shrink-0 rounded-full border-2 border-foreground/70 bg-card" />
          <div className="grid min-w-0 flex-1 gap-0.5">
            <p className="flex items-baseline justify-between gap-3 text-sm">
              <span className="font-medium">{METHOD_LABEL[p.method]}</span>
              <MoneyText value={p.amount} className="font-medium" />
            </p>
            <p className="truncate text-xs text-muted-foreground">
              <span className="tabular">{formatDate(p.paidAt)}</span>
              {p.reference && (
                <>
                  <span className="mx-1.5" aria-hidden>
                    ·
                  </span>
                  <span className="font-mono">{p.reference}</span>
                </>
              )}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
