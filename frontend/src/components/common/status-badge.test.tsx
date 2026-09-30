import { render, screen } from '@testing-library/react';
import { PaymentBadge, StatusBadge } from './status-badge';

describe('badges', () => {
  it('shows human labels for order and payment status', () => {
    render(
      <>
        <StatusBadge status="PACKING" />
        <PaymentBadge status="PARTIAL" />
      </>,
    );
    expect(screen.getByText('Packing')).toBeInTheDocument();
    expect(screen.getByText('Partial')).toBeInTheDocument();
  });
});
