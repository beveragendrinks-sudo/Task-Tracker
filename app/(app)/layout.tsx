import { redirect } from 'next/navigation';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import AppShell from '@/components/AppShell';
import type { SidebarCounts } from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  const supabase = createClient();
  const openStatuses = ['draft', 'assigned', 'negotiation', 'accepted', 'active', 'pending', 'on_hold', 'blocked', 'closed_by_owner', 'rejected_closure'];

  const [mineResult, givenResult, alertsResult, emailsResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', profile.id)
      .in('status', openStatuses),
    supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('created_by', profile.id)
      .in('status', openStatuses),
    supabase
      .from('ai_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open'),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', profile.id)
      .eq('email_sent', false),
  ]);

  const counts: SidebarCounts = {
    mine: mineResult.count ?? 0,
    given: givenResult.count ?? 0,
    alerts: alertsResult.count ?? 0,
    emails: emailsResult.count ?? 0,
  };

  return (
    <AppShell profile={profile} counts={counts}>
      {children}
    </AppShell>
  );
}
