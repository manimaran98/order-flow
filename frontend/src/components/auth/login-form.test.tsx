import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from './login-form';

describe('LoginForm', () => {
  it('submits credentials with the return path and shows the API error', async () => {
    const action = vi.fn(async () => ({ ok: false as const, error: 'Invalid email or password' }));
    render(<LoginForm action={action} next="/orders" />);
    await userEvent.type(screen.getByLabelText('Email'), 'owner@kedai.my');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
    await userEvent.click(screen.getByRole('button', { name: 'Log in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
    const formData = (action.mock.calls[0] as unknown[])[1] as FormData;
    expect(formData.get('email')).toBe('owner@kedai.my');
    expect(formData.get('next')).toBe('/orders');
  });
});
