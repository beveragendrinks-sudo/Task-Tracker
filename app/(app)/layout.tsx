import { redirect } from 'next/navigation';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--app-bg)' }}>
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0 overflow-auto">
        {children}
      </main>
    </div>
  );
}
