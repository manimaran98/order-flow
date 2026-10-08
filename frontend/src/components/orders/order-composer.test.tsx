import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Draft } from './order-draft';
import { OrderComposer } from './order-composer';

const { push, toast } = vi.hoisted(() => ({
  push: vi.fn(),
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));
vi.mock('sonner', () => ({ toast }));
vi.mock('@/actions/customers', () => ({
  searchCustomers: vi.fn(async () => [{ id: 'c1', name: 'Kedai Runcit Ali', phone: '+60123456789' }]),
  quickAddCustomer: vi.fn(),
}));
vi.mock('@/actions/products', () => ({ searchProducts: vi.fn(async () => []) }));

const ready: Draft = {
  customer: { id: 'c1', name: 'Kedai Runcit Ali' },
  lines: [{ productId: 'p1', name: 'Coke', sku: 'COKE-24', unitPrice: '12.50', stock: 1, quantity: 1 }],
  discount: '',
  notes: '',
};

beforeEach(() => {
  push.mockReset();
  Object.values(toast).forEach((f) => f.mockReset());
});

describe('OrderComposer', () => {
  it('keeps phone and desktop views in sync (resizing never loses the draft)', async () => {
    render(<OrderComposer mode="create" initial={ready} submit={vi.fn()} />);
    const totals = screen.getAllByRole('status', { name: 'Order total' });
    expect(totals).toHaveLength(2); // phone bottom bar + desktop summary
    totals.forEach((t) => expect(t).toHaveTextContent('RM 12.50'));

    await userEvent.click(screen.getByRole('button', { name: 'Increase Coke' })); // desktop line editor
    screen.getAllByRole('status', { name: 'Order total' }).forEach((t) => expect(t).toHaveTextContent('RM 25.00'));
  });

  it('submits once even when tapped twice, then opens the order with a stock warning', async () => {
    let resolve!: (v: unknown) => void;
    const submit = vi.fn(() => new Promise((r) => (resolve = r)));
    render(<OrderComposer mode="create" initial={ready} submit={submit as never} />);
    const [phoneSubmit] = screen.getAllByRole('button', { name: 'Create order' });
    await userEvent.click(phoneSubmit);
    await userEvent.click(phoneSubmit);
    expect(submit).toHaveBeenCalledTimes(1);
    expect(submit).toHaveBeenCalledWith({ customerId: 'c1', items: [{ productId: 'p1', quantity: 1 }], discount: 0, notes: null });

    resolve({ ok: true, data: { id: 'o1', stockWarnings: [{ productId: 'p1', sku: 'COKE-24', requested: 2, available: 1 }] } });
    await vi.waitFor(() => expect(push).toHaveBeenCalledWith('/orders/o1'));
    expect(toast.warning).toHaveBeenCalledWith(expect.stringContaining('COKE-24'));
  });

  it('shows the API error and stays on the page', async () => {
    const submit = vi.fn(async () => ({ ok: false as const, error: 'Product COKE-24 is inactive' }));
    render(<OrderComposer mode="create" initial={ready} submit={submit} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Create order' })[1]);
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent('Product COKE-24 is inactive');
    expect(push).not.toHaveBeenCalled();
  });

  it('keeps the draft and explains when saving fails (e.g. the connection drops)', async () => {
    const submit = vi.fn(async () => Promise.reject(new TypeError('Failed to fetch')));
    render(<OrderComposer mode="create" initial={ready} submit={submit as never} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Create order' })[1]);
    expect((await screen.findAllByRole('alert'))[0]).toHaveTextContent("Couldn't save the order. Check your connection and try again.");
    screen.getAllByRole('status', { name: 'Order total' }).forEach((t) => expect(t).toHaveTextContent('RM 12.50'));
    // The error renders before the transition settles, so wait for the button to come back.
    expect((await screen.findAllByRole('button', { name: 'Create order' }))[1]).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('picks a customer from search on an empty draft', async () => {
    render(<OrderComposer mode="create" submit={vi.fn()} />);
    const [phoneSearch] = screen.getAllByRole('searchbox', { name: 'Search customers' });
    await userEvent.type(phoneSearch, 'ali');
    await userEvent.click((await screen.findAllByRole('button', { name: /Kedai Runcit Ali/ }))[0]);
    expect(screen.getByText('Step 2 of 3 · Items')).toBeInTheDocument();
  });
});
