import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { getAnalyticsSummary } from '@/lib/analytics-dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!isAdmin(user)) redirect('/admin');
  } catch {
    if (process.env.NODE_ENV === 'production') redirect('/admin');
  }
  const params = await searchParams;
  const result = await getAnalyticsSummary({ start: params.start, end: params.end });
  return <AnalyticsDashboard initial={result.data} demo={result.demo} />;
}
