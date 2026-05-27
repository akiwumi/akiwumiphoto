import { createClient } from '@supabase/supabase-js';

const PLACEHOLDER = ['your-project', 'your-anon', 'your-service'];

function isConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  return (
    url.startsWith('https://') &&
    !PLACEHOLDER.some((p) => url.includes(p)) &&
    key.length > 20 &&
    !PLACEHOLDER.some((p) => key.includes(p))
  );
}

export function createServerClient() {
  if (!isConfigured()) {
    throw new Error('Supabase not configured — using demo data');
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
