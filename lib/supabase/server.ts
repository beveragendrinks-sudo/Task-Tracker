import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignoré dans les Server Components (cookies en lecture seule)
          }
        },
      },
    }
  );
}

/**
 * Récupère le profil de l'utilisateur connecté, en le créant si absent
 */
export async function getCurrentProfile() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let { data: profile } = await supabase
    .from('profiles')
    .select('*, entity:entities(*), department:departments!department_id(*)')
    .eq('auth_user_id', user.id)
    .single();

  // Créer le profil s'il n'existe pas encore (trigger non déclenché)
  if (!profile) {
    const fullName =
      user.user_metadata?.full_name ||
      (user.email ? user.email.split('@')[0] : 'Utilisateur');

    await supabase.from('profiles').insert({
      auth_user_id: user.id,
      email: user.email!,
      full_name: fullName,
      role: 'collaborator',
    });

    const { data: newProfile } = await supabase
      .from('profiles')
      .select('*, entity:entities(*), department:departments!department_id(*)')
      .eq('auth_user_id', user.id)
      .single();

    profile = newProfile;
  }

  return profile;
}
