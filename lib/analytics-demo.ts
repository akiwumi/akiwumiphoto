import type { AnalyticsRange, AnalyticsSummary } from './analytics-dashboard';

export const ANALYTICS_DEMO_NOTICE = 'Development demo fixture — Supabase has no analytics rows; values are illustrative only.';

const DEMO_DAILY = Array.from({ length: 30 }, (_, index) => ({
  day: `2026-09-${String(index + 1).padStart(2, '0')}`,
  unique_visitors: 12 + (index % 5),
  sessions: 16 + (index % 7),
  page_views: 28 + (index % 9) * 2,
}));

const DEMO_BASE: AnalyticsSummary = {
  range_start: '', range_end: '',
  headline: { unique_visitors: 42, sessions: 58, page_views: 121, contact_submissions: 4, checkout_starts: 7, completed_payments: 3, registrations: 9 },
  daily: DEMO_DAILY,
  top_pages: [{ path: '/home', events: 44 }, { path: '/galleries', events: 31 }, { path: '/contact', events: 12 }],
  top_referrers: [{ referrer_origin: 'https://instagram.com', events: 18 }, { referrer_origin: 'https://google.com', events: 11 }],
  top_devices: [{ device_class: 'mobile', events: 72 }, { device_class: 'desktop', events: 39 }, { device_class: 'tablet', events: 10 }],
  funnels: { visit_to_gallery: { visits: 58, gallery_interactions: 22 }, gallery_to_paid: { visits: 58, gallery_interactions: 22, checkout_starts: 7, paid_orders: 3 }, visit_to_registration: { visits: 58, registrations: 9 } },
};

export function getAnalyticsDemoSummary(range: AnalyticsRange): AnalyticsSummary {
  const startDay = range.start.slice(0, 10);
  const endDay = range.end.slice(0, 10);
  return { ...DEMO_BASE, range_start: range.start, range_end: range.end, daily: DEMO_DAILY.filter(({ day }) => day >= startDay && day < endDay) };
}
