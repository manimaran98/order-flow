import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PaymentForm } from './payment-form';

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('PaymentForm', () => {
  it('defaults to the outstanding amount and today, and caps at the outstanding amount', () => {
    render(<PaymentForm action={vi.fn()} outstanding="40.00" />);
    expect(screen.getByLabelText('Amount (RM)')).toHaveValue(40);
    expect(screen.getByLabelText('Amount (RM)')).toHaveAttribute('max', '40.00');
    expect(screen.getByLabelText('Method')).toHaveValue('BANK_TRANSFER');
    expect((screen.getByLabelText('Paid on') as HTMLInputElement).value).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('shows an API error and closes when saved', async () => {
    const action = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, error: 'Payment exceeds outstanding amount (RM 40.00)' })
      .mockResolvedValueOnce({ ok: true, data: undefined });
    const onDone = vi.fn();
    render(<PaymentForm action={action} outstanding="40.00" onDone={onDone} />);
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Payment exceeds outstanding amount (RM 40.00)');
    await userEvent.click(screen.getByRole('button', { name: 'Save payment' }));
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
  });
});
