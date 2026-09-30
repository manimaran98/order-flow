import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Customer } from '@/lib/types';
import { CustomerForm } from './customer-form';

const customer: Customer = {
  id: 'c1',
  name: 'Kedai Runcit Ali',
  phone: '+60123456789',
  email: null,
  address: 'Jalan Pasar, Ipoh',
  notes: null,
  createdAt: '2026-09-29T00:00:00Z',
  updatedAt: '2026-09-29T00:00:00Z',
};

describe('CustomerForm', () => {
  it('prefills an existing customer and confirms a save', async () => {
    const action = vi.fn(async () => ({ ok: true as const, data: undefined }));
    render(<CustomerForm action={action} customer={customer} submitLabel="Save changes" />);
    expect(screen.getByLabelText('Name')).toHaveValue('Kedai Runcit Ali');
    expect(screen.getByLabelText('Address')).toHaveValue('Jalan Pasar, Ipoh');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByRole('status')).toHaveTextContent('Saved');
  });

  it('shows the API error', async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: 'email must be an email' }));
    render(<CustomerForm action={action} submitLabel="Save customer" />);
    await userEvent.type(screen.getByLabelText('Name'), 'X');
    await userEvent.click(screen.getByRole('button', { name: 'Save customer' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('email must be an email');
  });
});
