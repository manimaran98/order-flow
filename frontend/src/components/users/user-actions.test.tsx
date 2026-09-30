import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { User } from '@/lib/types';
import { UserActions } from './user-actions';

const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn(async () => ({ ok: true, data: undefined })) }));
vi.mock('@/actions/users', () => ({ updateUser }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const staff: User = { id: 'u2', name: 'Siti', email: 'siti@kedai.my', role: 'STAFF', isActive: true, createdAt: '', updatedAt: '' };

describe('UserActions', () => {
  it('stops an admin from demoting or deactivating themselves', () => {
    render(<UserActions user={{ ...staff, id: 'me', role: 'ADMIN' }} isSelf />);
    expect(screen.getByLabelText('Role for Siti')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Deactivate' })).toBeDisabled();
  });

  it('deactivates and promotes other users', async () => {
    render(<UserActions user={staff} isSelf={false} />);
    await userEvent.click(screen.getByRole('button', { name: 'Deactivate' }));
    expect(updateUser).toHaveBeenCalledWith('u2', { isActive: false });
    await userEvent.selectOptions(screen.getByLabelText('Role for Siti'), 'ADMIN');
    expect(updateUser).toHaveBeenCalledWith('u2', { role: 'ADMIN' });
  });
});
