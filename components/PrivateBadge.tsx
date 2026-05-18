import { Lock } from 'lucide-react';

export default function PrivateBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-sm font-medium bg-sap-shell text-white ${small ? 'px-1 py-0.5 text-[10px]' : 'px-1.5 py-0.5 text-xs'}`}>
      <Lock className={small ? 'h-2.5 w-2.5' : 'h-3 w-3'} />
      Privée
    </span>
  );
}
