'use client';

import { SidebarProvider } from './SidebarContext';
import Sidebar, { type SidebarCounts } from './Sidebar';
import type { Profile } from '@/types/database';

export default function AppShell({
  profile,
  counts,
  children,
}: {
  profile: Profile;
  counts: SidebarCounts;
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen" style={{ background: 'var(--app-bg)' }}>
        <Sidebar profile={profile} counts={counts} />
        <main className="flex-1 min-w-0 overflow-auto">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
