'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

/** Debounced search box that writes `?<param>=` and resets pagination. */
export function SearchInput({ label, param = 'search' }: { label: string; param?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(param) ?? '');

  useEffect(() => {
    const timer = setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      if (value.trim()) next.set(param, value.trim());
      else next.delete(param);
      next.delete('page');
      if (next.toString() !== searchParams.toString()) router.replace(`${pathname}?${next}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [value, param, pathname, router, searchParams]);

  return (
    <div className="relative">
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input type="search" aria-label={label} placeholder={label} value={value} onChange={(e) => setValue(e.target.value)} className="pl-9" />
    </div>
  );
}
