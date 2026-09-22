import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';

export type AnalyticsRange = { start: string; end: string };
type HistoricalTraffic = {
  page_views: number;
  visitor_days: number;
  daily: Array<{ day: string; unique_visitors: number; sessions: number; page_views: number }>;
  top_pages: Array<{ path: string; events: number }>;
  top_referrers: Array<{ referrer_origin: string; events: number }>;
  top_devices: Array<{ device_class: string; events: number }>;
};
export type AnalyticsSummary = {
  range_start: string;
  range_end: string;
  headline: Record<string, number>;
  daily: Array<{ day: string; unique_visitors: number; sessions: number; page_views: number }>;
  top_pages: Array<{ path: string; events: number }>;
  top_referrers: Array<{ referrer_origin: string; events: number }>;
  top_devices: Array<{ device_class: string; events: number }>;
  historical: { tracking_started_at: string | null; checkout_starts: number; completed_payments: number; registrations: number; traffic: HistoricalTraffic };
  funnels: {
    visit_to_gallery: { visits: number; gallery_interactions: number };
    gallery_to_paid: { visits: number; gallery_interactions: number; checkout_starts: number; paid_orders: number };
    visit_to_registration: { visits: number; registrations: number };
  };
};

const EMPTY: AnalyticsSummary = {
  range_start: '', range_end: '', headline: {}, daily: [], top_pages: [], top_referrers: [], top_devices: [],
  historical: { tracking_started_at: null, checkout_starts: 0, completed_payments: 0, registrations: 0, traffic: { page_views: 0, visitor_days: 0, daily: [], top_pages: [], top_referrers: [], top_devices: [] } },
  funnels: { visit_to_gallery: { visits: 0, gallery_interactions: 0 }, gallery_to_paid: { visits: 0, gallery_interactions: 0, checkout_starts: 0, paid_orders: 0 }, visit_to_registration: { visits: 0, registrations: 0 } },
};

function mergeEventCounts<T extends { events: number }>(historicalRows: T[], liveRows: T[], getKey: (row: T) => string): T[] {
  const totals = new Map<string, T>();
  for (const row of [...historicalRows, ...liveRows]) {
    const key = getKey(row);
    const previous = totals.get(key);
    totals.set(key, previous ? { ...previous, events: previous.events + row.events } : { ...row });
  }
  return [...totals.values()].sort((a, b) => b.events - a.events || getKey(a).localeCompare(getKey(b))).slice(0, 10);
}

export function clampAnalyticsRange(start?: string | null, end?: string | null): AnalyticsRange {
  const now = Date.now();
  const parsedEnd = end && !Number.isNaN(Date.parse(end)) ? Date.parse(end) + (/^\d{4}-\d{2}-\d{2}$/.test(end) ? 86400000 : 0) : now;
  const endMs = Math.min(parsedEnd, now);
  const requestedStart = start && !Number.isNaN(Date.parse(start)) ? Date.parse(start) : endMs - 30 * 86400000;
  const startMs = Math.max(Math.min(requestedStart, endMs), endMs - 366 * 86400000);
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}

export async function getAnalyticsSummary(range?: Partial<AnalyticsRange>): Promise<AnalyticsSummary> {
  const bounded = clampAnalyticsRange(range?.start, range?.end);
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!isAdmin(user)) throw new Error('Admin required');
  const [trafficResult, historicalResult] = await Promise.all([
    supabase.rpc('get_analytics_summary', { start_at: bounded.start, end_at: bounded.end }),
    supabase.rpc('get_analytics_historical_summary', { start_at: bounded.start, end_at: bounded.end }),
  ]);
  if (trafficResult.error) throw trafficResult.error;
  const summary = trafficResult.data as Partial<AnalyticsSummary>;
  // Keep the dashboard available during deploys where code reaches production
  // before the accompanying Supabase migration/schema cache refresh.
  if (historicalResult.error && !['PGRST202', '42883'].includes(historicalResult.error.code || '')) {
    throw historicalResult.error;
  }
  const historicalData = historicalResult.error
    ? EMPTY.historical
    : historicalResult.data as Partial<AnalyticsSummary['historical']>;
  const historical = {
    ...EMPTY.historical,
    ...historicalData,
    traffic: { ...EMPTY.historical.traffic, ...historicalData.traffic },
  } as AnalyticsSummary['historical'];
  const daily = new Map<string, AnalyticsSummary['daily'][number]>();
  for (const day of [...(historical.traffic.daily ?? []), ...(summary.daily ?? [])]) {
    const previous = daily.get(day.day);
    daily.set(day.day, previous ? {
      day: day.day,
      unique_visitors: previous.unique_visitors + day.unique_visitors,
      sessions: previous.sessions + day.sessions,
      page_views: previous.page_views + day.page_views,
    } : { ...day });
  }
  const headline = { ...EMPTY.headline, ...summary.headline };
  headline.page_views = Number(headline.page_views || 0) + historical.traffic.page_views;
  return {
    ...EMPTY,
    ...summary,
    headline,
    daily: [...daily.values()].sort((a, b) => a.day.localeCompare(b.day)),
    top_pages: mergeEventCounts(historical.traffic.top_pages, summary.top_pages ?? [], (row) => row.path),
    top_referrers: mergeEventCounts(historical.traffic.top_referrers, summary.top_referrers ?? [], (row) => row.referrer_origin),
    top_devices: mergeEventCounts(historical.traffic.top_devices, summary.top_devices ?? [], (row) => row.device_class),
    historical,
    range_start: bounded.start,
    range_end: bounded.end,
  };
}
