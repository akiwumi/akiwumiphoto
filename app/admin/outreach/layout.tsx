import { redirect } from 'next/navigation';
import AdminShell from '../dashboard/AdminShell';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

export default async function OutreachLayout({ children }: { children: React.ReactNode }) {
  try {
    const client = await createServerClient();
    const { data: { user } } = await client.auth.getUser();
    if (!isAdmin(user)) redirect('/admin');
  } catch {
    redirect('/admin');
  }
  return <AdminShell>{children}</AdminShell>;
}
