import { createUser } from '@/actions/users';
import { AdminOnly } from '@/components/common/empty-state';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <UsersList users={users.data} currentUserId={me.id} />
        <Card>
          <CardHeader>
            <CardTitle>Add a user</CardTitle>
          </CardHeader>
          <CardContent>
            <CreateUserForm action={createUser} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
