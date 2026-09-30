import { FilterSelect } from '@/components/common/filter-select';
import { SearchInput } from '@/components/common/search-input';

export function OrderFilters() {
  return (
    <div className="mb-4 grid gap-2 sm:grid-cols-[2fr_1fr_1fr]">
      <div className="self-end">
        <SearchInput label="Search orders" />
      </div>
      <FilterSelect
        label="Status"
        param="status"
        options={[
          { value: '', label: 'All statuses' },
          { value: 'PENDING', label: 'Pending' },
          { value: 'CONFIRMED,PACKING,READY', label: 'Awaiting fulfilment' },
          { value: 'CONFIRMED', label: 'Confirmed' },
          { value: 'PACKING', label: 'Packing' },
          { value: 'READY', label: 'Ready' },
          { value: 'DELIVERED', label: 'Delivered' },
          { value: 'CANCELLED', label: 'Cancelled' },
        ]}
      />
      <FilterSelect
        label="Payment"
        param="paymentStatus"
        options={[
          { value: '', label: 'All payments' },
          { value: 'UNPAID,PARTIAL', label: 'Not fully paid' },
          { value: 'UNPAID', label: 'Unpaid' },
          { value: 'PARTIAL', label: 'Partial' },
          { value: 'PAID', label: 'Paid' },
        ]}
      />
    </div>
  );
}
