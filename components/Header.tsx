'use client';

import Link from 'next/link';
import { Search, Plus, Bell } from 'lucide-react';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="bg-white border-b border-stone-200 sticky top-0 z-20">
      <div className="px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-stone-900">{title}</h1>
          {subtitle && <p className="text-sm text-stone-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-stone-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              className="pl-9 pr-4 py-2 text-sm border border-stone-300 rounded-lg w-64 focus:border-amber-700 focus:ring-1 focus:ring-amber-700 focus:outline-none"
            />
          </div>

          <button className="relative p-2 hover:bg-stone-100 rounded-lg">
            <Bell className="h-5 w-5 text-stone-700" />
          </button>

          <Link
            href="/tasks/new"
            className="bg-stone-900 hover:bg-stone-800 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <Plus className="h-4 w-4" /> Nouvelle tâche
          </Link>
        </div>
      </div>
    </div>
  );
}
