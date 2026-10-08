import { createUser } from '@/actions/users';
import { AdminOnly } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { CreateUserForm } from '@/components/users/create-user-form';
import { UsersList } from '@/components/users/users-list';
import { apiFetch } from '@/lib/api';
import { getCurrentUser } from '@/lib/current-user';
import type { Paginated, User } from '@/lib/types';

export const metadata = { title: 'Users' };

export default async function UsersPage() {
  const me = await getCurrentUser();
  if (me.role !== 'ADMIN') return <AdminOnly />;
  const users = await apiFetch<Paginated<User>>('/users', { query: { limit: 100 } });
  return (
    <>
      <PageHeader title="Users" description="Give staff their own logins. Deactivating someone signs them out at once." />
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-6">
        <UsersList users={users.data} currentUserId={me.id} />
        <section aria-labelledby="add-user-heading" className="overflow-hidden rounded-lg border bg-card">
          <div className="flex min-h-12 items-center border-b px-4 py-3 md:px-5">
            <h2 id="add-user-heading" className="text-[0.9375rem] font-semibold tracking-[-0.01em]">
              Add a user
            </h2>
          </div>
          <CreateUserForm action={createUser} />
        </section>
      </div>
    </>
  );
}
