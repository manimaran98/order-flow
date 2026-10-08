import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer } from '@/lib/types';

const dash = <span className="text-muted-foreground">—</span>;

export function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card shadow-xs">
      <ul className="divide-y md:hidden">
        {customers.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="flex min-h-14 items-center gap-3 px-4 py-3 transition-colors duration-150 active:bg-surface">
              <span className="grid min-w-0 flex-1 gap-0.5">
                <span className="truncate text-sm font-medium">{c.name}</span>
                <span className="truncate text-[0.8125rem] text-muted-foreground">
                  {[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}
                </span>
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-muted-foreground" />
            </Link>
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Address</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id} className="relative">
                <TableCell className="max-w-[16rem] truncate">
                  {/* The name link stretches over the whole row, so any click opens the customer. */}
                  <Link
                    href={`/customers/${c.id}`}
                    className="font-medium text-foreground outline-none after:absolute after:inset-0 hover:text-primary focus-visible:after:ring-3 focus-visible:after:ring-ring/35 focus-visible:after:ring-inset"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="tabular">{c.phone || dash}</TableCell>
                <TableCell className="max-w-[16rem] truncate">{c.email || dash}</TableCell>
                <TableCell className="max-w-[20rem] truncate text-muted-foreground">{c.address || dash}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
