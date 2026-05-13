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
    <aside className="w-64 flex flex-col h-screen sticky top-0 shrink-0" style={{ background: 'var(--sidebar-bg)' }}>
      {/* Logo */}
      <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shrink-0">
            <GanttChartSquare className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="font-serif text-[17px] text-white leading-tight tracking-tight">Task Engine</div>
            <div className="text-[9px] uppercase tracking-[0.2em] text-slate-500 mt-0.5">ELKATEB GROUP</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
        <div className="px-3 pb-2 pt-1">
          <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Navigation</span>
        </div>

        {navItems.map(item => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                active
                  ? 'text-amber-400'
                  : 'text-slate-400 hover:text-slate-100'
              }`}
              style={active ? { background: 'var(--sidebar-active)' } : undefined}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-amber-500 rounded-r-full" />}
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span className="flex-1">{item.label}</span>
            </Link>
          );
        })}

        {profile.role === 'admin' && (
          <>
            <div className="px-3 pb-2 pt-4">
              <span className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-600">Admin</span>
            </div>
            <Link
              href="/admin"
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive('/admin') ? 'text-amber-400' : 'text-slate-400 hover:text-slate-100'
              }`}
              style={isActive('/admin') ? { background: 'var(--sidebar-active)' } : undefined}
              onMouseEnter={e => { if (!isActive('/admin')) (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-hover)'; }}
              onMouseLeave={e => { if (!isActive('/admin')) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              <Settings className={`h-4 w-4 shrink-0 ${isActive('/admin') ? 'text-amber-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
              <span>Administration</span>
            </Link>
          </>
        )}
      </nav>

      {/* User card */}
      <div className="p-3" style={{ borderTop: '1px solid var(--sidebar-border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg" style={{ background: 'var(--sidebar-hover)' }}>
          <Avatar name={profile.full_name} size="md" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-slate-100 truncate">{profile.full_name}</div>
            <div className="text-xs text-slate-500 truncate">{roleLabel(profile.role)}</div>
          </div>
          <button
            onClick={handleSignOut}
            title="Déconnexion"
            className="p-1.5 rounded-md text-slate-600 hover:text-slate-300 hover:bg-white/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
