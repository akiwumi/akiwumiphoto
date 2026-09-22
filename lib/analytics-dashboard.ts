import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

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

function demoSummary(range: AnalyticsRange): AnalyticsSummary {
  const start = Date.parse(range.start); const end = Date.parse(range.end);
  const days = Math.max(1, Math.min(31, Math.ceil((end - start) / 86400000)));
  const daily = Array.from({ length: days }, (_, i) => ({ day: new Date(start + i * 86400000).toISOString().slice(0, 10), unique_visitors: 12 + (i % 5), sessions: 16 + (i % 7), page_views: 28 + (i % 9) * 2 }));
  return { ...EMPTY, range_start: range.start, range_end: range.end, headline: { unique_visitors: 42, sessions: 58, page_views: 121, contact_submissions: 4, checkout_starts: 7, completed_payments: 3, registrations: 9 }, daily, top_pages: [{ path: '/home', events: 44 }, { path: '/galleries', events: 31 }, { path: '/contact', events: 12 }], top_referrers: [{ referrer_origin: 'https://instagram.com', events: 18 }, { referrer_origin: 'https://google.com', events: 11 }], top_devices: [{ device_class: 'mobile', events: 72 }, { device_class: 'desktop', events: 39 }, { device_class: 'tablet', events: 10 }], funnels: { visit_to_gallery: { visits: 58, gallery_interactions: 22 }, gallery_to_paid: { visits: 58, gallery_interactions: 22, checkout_starts: 7, paid_orders: 3 }, visit_to_registration: { visits: 58, registrations: 9 } } };
}

export async function getAnalyticsSummary(range?: Partial<AnalyticsRange>): Promise<{ data: AnalyticsSummary; demo: boolean }> {
  const bounded = clampAnalyticsRange(range?.start, range?.end);
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!isAdmin(user)) throw new Error('Admin required');
    const { data, error } = await supabase.rpc('get_analytics_summary', { start_at: bounded.start, end_at: bounded.end });
    if (error) throw error;
    return { data: { ...EMPTY, ...(data as Partial<AnalyticsSummary>), range_start: bounded.start, range_end: bounded.end }, demo: false };
  } catch (error) {
    if (process.env.NODE_ENV === 'production' || !String(error).includes('Supabase not configured')) throw error;
    return { data: demoSummary(bounded), demo: true };
  }
}
