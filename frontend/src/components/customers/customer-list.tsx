import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Customer } from '@/lib/types';

export function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <>
      <ul className="grid gap-2 md:hidden">
        {customers.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="block rounded-lg border bg-card p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-sm text-muted-foreground">{[c.phone, c.email].filter(Boolean).join(' · ') || 'No contact details'}</p>
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
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium underline-offset-4 hover:underline">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.phone}</TableCell>
                <TableCell>{c.email}</TableCell>
                <TableCell className="max-w-xs truncate">{c.address}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
