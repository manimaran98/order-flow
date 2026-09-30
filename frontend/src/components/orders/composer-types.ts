import type { Dispatch } from 'react';
import type { Draft, DraftAction, DraftTotals } from './order-draft';

/** Everything both layouts need; one OrderComposer owns it so resizing never loses the draft. */
export type ComposerViewProps = {
  draft: Draft;
  dispatch: Dispatch<DraftAction>;
  totals: DraftTotals;
  pending: boolean;
  error: string | null;
  onSubmit: () => void;
  submitLabel: string;
};
