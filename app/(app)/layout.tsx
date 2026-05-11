import { redirect } from 'next/navigation';
import { createClient, getCurrentProfile } from '@/lib/supabase/server';
import Sidebar from '@/components/Sidebar';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  if (!profile) {
    // Sign out to prevent a redirect loop: the middleware would otherwise
    // redirect an authenticated user from /login back to /dashboard.
    const supabase = createClient();
    await supabase.auth.signOut();
    redirect('/login');
  }

  return (
    <div className="flex bg-stone-50 min-h-screen">
      <Sidebar profile={profile} />
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
