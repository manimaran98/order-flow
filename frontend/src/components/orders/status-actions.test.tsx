import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StatusActions } from './status-actions';

const { changeOrderStatus, toast } = vi.hoisted(() => ({
  changeOrderStatus: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/actions/orders', () => ({ changeOrderStatus, deleteOrder: vi.fn() }));
vi.mock('sonner', () => ({ toast }));

beforeEach(() => {
  changeOrderStatus.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

describe('StatusActions', () => {
  it('offers the next step, edit, cancel and (for admins) delete on a new order', () => {
    render(<StatusActions orderId="o1" status="PENDING" role="ADMIN" paymentCount={0} layout="desktop" />);
    expect(screen.getByRole('button', { name: 'Confirm order' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Edit order' })).toHaveAttribute('href', '/orders/o1/edit');
    expect(screen.getByRole('button', { name: 'Cancel order' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete order' })).toBeInTheDocument();
  });

  it('hides delete from staff and everything on a delivered order', () => {
    const { rerender } = render(<StatusActions orderId="o1" status="PENDING" role="STAFF" paymentCount={0} layout="desktop" />);
    expect(screen.queryByRole('button', { name: 'Delete order' })).not.toBeInTheDocument();
    rerender(<StatusActions orderId="o1" status="DELIVERED" role="ADMIN" paymentCount={0} layout="desktop" />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('moves the order and reports insufficient stock', async () => {
    changeOrderStatus.mockResolvedValueOnce({ ok: false, error: 'Insufficient stock for COKE-24: requested 11, available 10' });
    render(<StatusActions orderId="o1" status="PENDING" role="STAFF" paymentCount={0} layout="phone" />);
    await userEvent.click(screen.getByRole('button', { name: 'Confirm order' }));
    expect(changeOrderStatus).toHaveBeenCalledWith('o1', 'CONFIRMED');
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('Insufficient stock for COKE-24: requested 11, available 10'));
  });
});
