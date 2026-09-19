import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
export async function requireOutreachAdmin() {
  if (process.env.NODE_ENV !== 'production' && process.env.OUTREACH_LOCAL_DEMO === '1') return { client: null, user: null };
  const client = await createServerClient(); const { data: { user } } = await client.auth.getUser();
  if (!isAdmin(user)) throw new Error('OUTREACH_UNAUTHORIZED'); return { client, user };
}
