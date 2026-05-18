'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { Building2 } from 'lucide-react';

interface Props {
  entities: { id: string; name: string }[];
  currentEntityId: string | null;
}

export default function EntityFilter({ entities, currentEntityId }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set('entity_id', value);
    } else {
      params.delete('entity_id');
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
      <select
        value={currentEntityId ?? ''}
        onChange={e => handleChange(e.target.value)}
        className="text-sm border border-slate-200 rounded-lg px-3 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent cursor-pointer"
      >
        <option value="">Toutes les entités</option>
        {entities.map(e => (
          <option key={e.id} value={e.id}>{e.name}</option>
        ))}
      </select>
    </div>
  );
}
