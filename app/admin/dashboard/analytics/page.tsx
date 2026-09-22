import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { clampAnalyticsRange, getAnalyticsSummary } from '@/lib/analytics-dashboard';
import AnalyticsDashboard from './AnalyticsDashboard';

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ start?: string; end?: string }> }) {
  const params = await searchParams;
  try {
    const auth = await createServerClient();
    const { data: { user } } = await auth.auth.getUser();
    if (!isAdmin(user)) redirect('/admin');
  } catch {
    if (process.env.NODE_ENV === 'production') redirect('/admin');
  }
  let result: Awaited<ReturnType<typeof getAnalyticsSummary>> | null = null;
  try { result = await getAnalyticsSummary({ start: params.start, end: params.end }); } catch { /* rendered below */ }
  return result
    ? <AnalyticsDashboard initial={result} customRange={Boolean(params.start?.match(/^\d{4}-\d{2}-\d{2}$/) || params.end?.match(/^\d{4}-\d{2}-\d{2}$/))} />
    : <AnalyticsDashboard initial={null} error="Analytics are temporarily unavailable. Try again later." />;
}
