import { createCustomer } from '@/actions/customers';
import { PageHeader } from '@/components/common/page-header';
import { CustomerForm } from '@/components/customers/customer-form';

export const metadata = { title: 'New customer' };

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader title="New customer" back={{ href: '/customers', label: 'Customers' }} />
      <div className="max-w-2xl overflow-hidden rounded-lg border bg-card shadow-xs">
        <CustomerForm action={createCustomer} submitLabel="Save customer" cancelHref="/customers" />
      </div>
    </>
  );
}
