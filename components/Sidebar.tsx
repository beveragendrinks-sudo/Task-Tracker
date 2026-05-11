'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, KanbanSquare, ClipboardList, Send, Activity,
  TrendingUp, Sparkles, Settings, LogOut, GanttChartSquare
} from 'lucide-react';
import { Avatar } from './Badges';
import { roleLabel } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/kanban', label: 'Kanban Board', icon: KanbanSquare },
  { href: '/tasks/mine', label: 'Mes tâches', icon: ClipboardList },
  { href: '/tasks/given', label: 'Tâches données', icon: Send },
  { href: '/workload', label: 'Workload', icon: Activity },
  { href: '/alerts', label: 'Alertes IA', icon: Sparkles },
];

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + '/');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-64 bg-stone-900 text-stone-100 flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-stone-800">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center">
            <GanttChartSquare className="h-5 w-5 text-stone-900" />
          </div>
          <div>
            <div className="font-serif text-lg leading-none">Task Engine</div>
            <div className="text-[10px] uppercase tracking-widest text-stone-500 mt-0.5">Group OS</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-amber-800/30 text-amber-100 border-l-2 border-amber-500'
                  : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}

        {profile.role === 'general_manager' || profile.role === 'admin' ? (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive('/admin')
                ? 'bg-amber-800/30 text-amber-100 border-l-2 border-amber-500'
                : 'text-stone-400 hover:bg-stone-800 hover:text-stone-100'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span className="flex-1">Administration</span>
          </Link>
        ) : null}
      </nav>

      <div className="p-3 border-t border-stone-800">
        <div className="flex items-center gap-3 p-2 rounded-lg">
          <Avatar name={profile.full_name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium truncate">{profile.full_name}</div>
            <div className="text-xs text-stone-500 truncate">{roleLabel(profile.role)}</div>
          </div>
          <button onClick={handleSignOut} title="Déconnexion" className="text-stone-500 hover:text-stone-200">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
