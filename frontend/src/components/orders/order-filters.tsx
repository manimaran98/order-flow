import { FilterSelect } from '@/components/common/filter-select';
import { SearchInput } from '@/components/common/search-input';

/** The list panel's toolbar row. */
export function OrderFilters() {
  return (
    <div className="grid grid-cols-2 gap-3 border-b px-4 py-3 md:px-5 lg:grid-cols-[minmax(0,1fr)_13rem_13rem] lg:items-end">
      <div className="col-span-2 lg:col-span-1">
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
