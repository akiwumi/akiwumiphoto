import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { createServerClient } from '@/lib/supabase-server';

export default async function DashboardPage() {
  // Verify session server-side
  try {
    const supabase = createServerClient();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) redirect('/admin');
  } catch {
    // If supabase isn't configured yet, allow access in dev
    if (process.env.NODE_ENV === 'production') redirect('/admin');
  }

  return <DashboardClient />;
}
