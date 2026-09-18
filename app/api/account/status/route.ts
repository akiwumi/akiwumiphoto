import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ signedIn: false, registered: false });
  const { count } = await supabase.from('collectors').select('id', { count: 'exact', head: true }).eq('auth_user_id', user.id).eq('email_verified', true);
  return NextResponse.json({ signedIn: Boolean(user.email_confirmed_at), registered: (count ?? 0) > 0 });
}
