'use client';

import Link from 'next/link';
import { Bell, Search, Plus, ChevronDown, LogOut, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Avatar } from './Badges';
import { roleLabel } from '@/lib/utils';

export default function ShellBar({ profile }: { profile: any }) {
  const router = useRouter();
  const supabase = createClient();
  const [menuOpen, setMenuOpen] = useState(false);

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="bg-sap-shell text-white sticky top-0 z-30 border-b border-sap-shell-dark">
      <div className="h-12 flex items-center px-4 gap-4">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2 text-base font-light hover:bg-sap-shell-dark px-3 py-1.5 rounded">
          <div className="h-6 w-6 rounded bg-sap-brand flex items-center justify-center text-xs font-bold">TE</div>
          <span>Task Engine</span>
        </Link>

        {/* Search */}
        <div className="flex-1 max-w-md ml-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-4 w-4 text-white/60" />
            <input
              type="text"
              placeholder="Rechercher tâches, utilisateurs..."
              className="w-full pl-9 pr-3 py-1.5 bg-sap-shell-dark text-white text-sm placeholder-white/60 border border-sap-shell-dark rounded focus:outline-none focus:bg-white focus:text-sap-text focus:placeholder-sap-text-secondary"
            />
          </div>
        </div>

        <div className="flex-1" />

        {/* Actions */}
        <Link
          href="/tasks/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sap-brand hover:bg-sap-brand-dark rounded text-sm font-medium"
        >
          <Plus className="h-4 w-4" /> Nouvelle tâche
        </Link>

        <button className="relative p-1.5 hover:bg-sap-shell-dark rounded">
          <Bell className="h-5 w-5" />
        </button>

        {/* User menu */}
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-2 hover:bg-sap-shell-dark px-2 py-1 rounded">
            <Avatar name={profile.full_name} size="xs" />
            <span className="text-sm">{profile.full_name}</span>
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-sap-border rounded shadow-sap-card z-50 text-sap-text">
                <div className="p-3 border-b border-sap-border">
                  <div className="font-medium text-sm">{profile.full_name}</div>
                  <div className="text-xs text-sap-text-secondary">{profile.email}</div>
                  <div className="text-xs text-sap-text-secondary mt-1">{roleLabel(profile.role)}</div>
                </div>
                <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-sap-bg">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
