import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { getAnalyticsDemoSummary } from './analytics-demo';

export type AnalyticsRange = { start: string; end: string };
export type AnalyticsSummary = {
  range_start: string;
  range_end: string;
  headline: Record<string, number>;
  daily: Array<{ day: string; unique_visitors: number; sessions: number; page_views: number }>;
  top_pages: Array<{ path: string; events: number }>;
  top_referrers: Array<{ referrer_origin: string; events: number }>;
  top_devices: Array<{ device_class: string; events: number }>;
  funnels: {
    visit_to_gallery: { visits: number; gallery_interactions: number };
    gallery_to_paid: { visits: number; gallery_interactions: number; checkout_starts: number; paid_orders: number };
    visit_to_registration: { visits: number; registrations: number };
  };
};

const EMPTY: AnalyticsSummary = {
  range_start: '', range_end: '', headline: {}, daily: [], top_pages: [], top_referrers: [], top_devices: [],
  funnels: { visit_to_gallery: { visits: 0, gallery_interactions: 0 }, gallery_to_paid: { visits: 0, gallery_interactions: 0, checkout_starts: 0, paid_orders: 0 }, visit_to_registration: { visits: 0, registrations: 0 } },
};

export function clampAnalyticsRange(start?: string | null, end?: string | null): AnalyticsRange {
  const now = Date.now();
  const parsedEnd = end && !Number.isNaN(Date.parse(end)) ? Date.parse(end) + (/^\d{4}-\d{2}-\d{2}$/.test(end) ? 86400000 : 0) : now;
  const endMs = Math.min(parsedEnd, now);
  const requestedStart = start && !Number.isNaN(Date.parse(start)) ? Date.parse(start) : endMs - 30 * 86400000;
  const startMs = Math.max(Math.min(requestedStart, endMs), endMs - 366 * 86400000);
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}

function canUseDemoFixture(error: unknown): boolean {
  return process.env.NODE_ENV !== 'production'
    && error instanceof Error
    && error.message.includes('Supabase not configured');
}

export async function getAnalyticsSummary(range?: Partial<AnalyticsRange>): Promise<{ data: AnalyticsSummary; demo: boolean }> {
  const bounded = clampAnalyticsRange(range?.start, range?.end);
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user)) throw new Error('Admin required');
    const { data, error } = await supabase.rpc('get_analytics_summary', { start_at: bounded.start, end_at: bounded.end });
    if (error) throw error;
    const { data: hasEvents, error: presenceError } = await supabase.rpc('has_analytics_events');
    if (presenceError) throw presenceError;
    const summary = data as Partial<AnalyticsSummary>;
    if (process.env.NODE_ENV !== 'production' && hasEvents === false) return { data: getAnalyticsDemoSummary(bounded), demo: true };
    return { data: { ...EMPTY, ...summary, range_start: bounded.start, range_end: bounded.end }, demo: false };
  } catch (error) {
    if (!canUseDemoFixture(error)) throw error;
    return { data: getAnalyticsDemoSummary(bounded), demo: true };
  }
}
