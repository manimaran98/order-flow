import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AdjustStockForm } from './adjust-stock';

vi.mock('@/actions/inventory', () => ({ adjustStock: vi.fn() }));

describe('AdjustStockForm', () => {
  it('asks for a positive restock and an explained adjustment', async () => {
    const action = vi.fn(async () => ({ ok: true as const, data: undefined }));
    render(<AdjustStockForm action={action} productId="p1" />);
    expect(screen.getByLabelText('Quantity')).toHaveAttribute('min', '1');
    expect(screen.getByLabelText('Note')).not.toBeRequired();

    await userEvent.selectOptions(screen.getByLabelText('Type'), 'ADJUSTMENT');
    expect(screen.getByLabelText('Quantity')).not.toHaveAttribute('min');
    expect(screen.getByLabelText('Note')).toBeRequired();
  });

  it('sends the product id with the adjustment', async () => {
    const action = vi.fn(async () => ({ ok: true as const, data: undefined }));
    const onDone = vi.fn();
    render(<AdjustStockForm action={action} productId="p1" onDone={onDone} />);
    await userEvent.type(screen.getByLabelText('Quantity'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Save adjustment' }));
    const fd = (action.mock.calls[0] as unknown[])[1] as FormData;
    expect(fd.get('productId')).toBe('p1');
    expect(fd.get('type')).toBe('RESTOCK');
    expect(fd.get('quantity')).toBe('5');
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled());
  });
});
