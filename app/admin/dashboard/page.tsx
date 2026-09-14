import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

export default async function DashboardPage() {
  // Verified server-side against Supabase Auth (getUser, not the unverified
  // cookie session), and against the admin role rather than any session.
  let allowed: boolean;
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    allowed = isAdmin(user);
  } catch {
    // Supabase isn't configured: only the local demo may look around.
    allowed = process.env.NODE_ENV !== 'production';
  }

  if (!allowed) redirect('/admin');

  return <DashboardClient />;
}
