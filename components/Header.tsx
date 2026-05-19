'use client';

import Link from 'next/link';
import { Search, Plus, Bell, Menu } from 'lucide-react';
import { useSidebar } from './SidebarContext';

export default function Header({ title, subtitle }: { title: string; subtitle?: string }) {
  const { toggle } = useSidebar();

  return (
    <div className="bg-white/80 backdrop-blur-md sticky top-0 z-20" style={{ borderBottom: '1px solid #e2e8f0', boxShadow: '0 1px 0 0 rgb(0 0 0 / 0.04)' }}>
      <div className="px-4 md:px-7 py-3 md:py-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Hamburger — mobile only */}
          <button
            onClick={toggle}
            className="md:hidden p-2 -ml-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Ouvrir le menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0">
            <h1 className="font-serif text-[18px] md:text-[22px] text-slate-900 leading-tight truncate">{title}</h1>
            {subtitle && <p className="text-xs text-slate-500 mt-0.5 hidden sm:block">{subtitle}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Search — desktop only
          <div className="relative hidden md:block">
            <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Rechercher une tâche…"
              className="pl-8 pr-4 py-2 text-sm border border-slate-200 rounded-lg w-56 bg-slate-50
                         focus:bg-white focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 focus:outline-none
                         placeholder:text-slate-400 transition-all duration-150"
            />
          </div>  */}

          {/* Notifications
          <button className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-amber-500 rounded-full ring-2 ring-white" />
          </button> */}

          {/* New task */}
          <Link
            href="/tasks/new"
            className="btn-primary flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nouvelle tâche</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
