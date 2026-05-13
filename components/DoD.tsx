'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';

type DoDItem = { label: string; done?: boolean };

interface Props {
  taskId: string;
  initial: DoDItem[];
}

export default function DoD({ taskId, initial }: Props) {
  const [dod, setDod] = useState<DoDItem[]>(initial || []);
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = async (index: number) => {
    setError(null);
    const previous = dod;
    const updated = dod.map((d, i) => (i === index ? { ...d, done: !d.done } : d));
    setDod(updated);
    setLoadingIndex(index);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ definition_of_done: updated }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Erreur serveur' }));
        setError(data?.error || 'Erreur serveur');
        setDod(previous);
        return;
      }

      const data = await res.json();
      setDod(data.task.definition_of_done || updated);
    } catch (err) {
      setError('Erreur réseau');
      setDod(previous);
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && <div className="text-red-600 text-xs">{error}</div>}
      {dod.map((d, i) => (
        <button
          key={i}
          onClick={(e) => { e.preventDefault(); if (loadingIndex === null) toggle(i); }}
          className="w-full text-left"
        >
          <div className={`flex items-center gap-3 p-3 bg-stone-50 border border-stone-200 rounded-lg ${d.done ? 'opacity-70' : ''}`}>
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 ${d.done ? 'bg-emerald-600 border-emerald-600' : 'border-stone-300 bg-white'}`}>
              {d.done && <span className="text-white text-xs">✓</span>}
            </div>
            <span className={`text-sm flex-1 ${d.done ? 'line-through text-stone-400' : 'text-stone-800'}`}>
              {d.label}
            </span>
            {loadingIndex === i && <Loader2 className="h-4 w-4 animate-spin text-stone-500" />}
          </div>
        </button>
      ))}
    </div>
  );
}
