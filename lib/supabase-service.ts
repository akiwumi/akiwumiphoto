import { createClient } from '@supabase/supabase-js';

/**
 * Server-only Supabase client using the service-role key.
 * Bypasses RLS — never import this in client components or expose to the browser.
 * Used exclusively for generating signed URLs on the server.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
