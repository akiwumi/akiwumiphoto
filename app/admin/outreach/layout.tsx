import { redirect } from 'next/navigation';
import AdminShell from '../dashboard/AdminShell';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

export default async function OutreachLayout({ children }: { children: React.ReactNode }) {
  if (process.env.NODE_ENV !== 'production' && process.env.OUTREACH_LOCAL_DEMO === '1') return <AdminShell>{children}</AdminShell>;
  try {
    const client = await createServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!isAdmin(user)) redirect('/admin');
  } catch {
    redirect('/admin');
  }
  return <AdminShell>{children}</AdminShell>;
}
