import { createClient as createSupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase avec la clé de service (bypasse RLS).
 * À n'utiliser que dans des API routes côté serveur.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!serviceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante');

  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
