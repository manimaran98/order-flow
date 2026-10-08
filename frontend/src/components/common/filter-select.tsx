'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useId } from 'react';
import { Label } from '@/components/ui/label';
import { selectClass } from './field';

export function FilterSelect({ label, param, options }: { label: string; param: string; options: { value: string; label: string }[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const id = useId();
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <select
        id={id}
        className={selectClass}
        value={searchParams.get(param) ?? ''}
        onChange={(e) => {
          const next = new URLSearchParams(searchParams);
          if (e.target.value) next.set(param, e.target.value);
          else next.delete(param);
          next.delete('page');
          router.replace(`${pathname}?${next}`);
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
