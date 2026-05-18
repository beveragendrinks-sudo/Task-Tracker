'use client';

import { Lock, Eye } from 'lucide-react';

interface Props {
  value: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function PrivacyToggle({
  value,
  onChange,
  label = 'Tâche privée',
  description = 'Seuls le créateur, le responsable et les utilisateurs explicitement autorisés voient le contenu.',
  disabled = false
}: Props) {
  return (
    <div className={`border rounded p-3 ${value ? 'border-sap-shell bg-sap-bg' : 'border-sap-border bg-white'}`}>
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
          className="mt-0.5 rounded text-sap-brand"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-sm font-medium text-sap-text">
            {value ? <Lock className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            {label}
          </div>
          <p className="text-xs text-sap-text-secondary mt-0.5">{description}</p>
          {value && (
            <p className="text-[11px] text-sap-shell mt-1.5 italic">
              ⚠ Même le DG/Admin ne verra pas le contenu sans ajout manuel comme utilisateur autorisé.
            </p>
          )}
        </div>
      </label>
    </div>
  );
}
