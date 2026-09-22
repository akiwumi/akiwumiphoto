import { createClient } from '@supabase/supabase-js';

const token = process.env.VERCEL_API_TOKEN;
const projectId = process.env.VERCEL_PROJECT_ID;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!token || !projectId || !supabaseUrl || !serviceKey) {
  throw new Error('Set VERCEL_API_TOKEN, VERCEL_PROJECT_ID, SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL), and SUPABASE_SERVICE_ROLE_KEY.');
}

const days = Math.max(1, Math.min(366, Number.parseInt(process.env.ANALYTICS_HISTORY_DAYS || '365', 10) || 365));
const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: firstTrackedEvent, error: firstEventError } = await supabase
  .from('analytics_events')
  .select('occurred_at')
  .order('occurred_at', { ascending: true })
  .limit(1)
  .maybeSingle();
if (firstEventError) throw new Error(`Could not find the first tracked event (${firstEventError.code || 'database error'}).`);

const yesterday = new Date();
yesterday.setUTCHours(0, 0, 0, 0);
yesterday.setUTCDate(yesterday.getUTCDate() - 1);
const firstTrackedDay = firstTrackedEvent?.occurred_at ? new Date(firstTrackedEvent.occurred_at) : null;
if (firstTrackedDay && firstTrackedDay < yesterday) {
  yesterday.setTime(firstTrackedDay.getTime());
  yesterday.setUTCHours(0, 0, 0, 0);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
}
const since = new Date(yesterday);
since.setUTCDate(since.getUTCDate() - days + 1);
const sinceDate = since.toISOString().slice(0, 10);
const untilDate = yesterday.toISOString().slice(0, 10);

async function query(by) {
  const params = new URLSearchParams({ projectId, since: sinceDate, until: untilDate, limit: '1000' });
  if (process.env.VERCEL_TEAM_ID) params.set('teamId', process.env.VERCEL_TEAM_ID);
  for (const dimension of by) params.append('by', dimension);
  const response = await fetch(`https://api.vercel.com/v1/query/web-analytics/visits/aggregate?${params}`, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Vercel analytics query failed with HTTP ${response.status}; confirm API token access and the account reporting window.`);
  const payload = await response.json();
  if (!Array.isArray(payload.data)) throw new Error('Vercel returned an unexpected aggregate response.');
  return payload.data;
}

function dayOf(row) {
  const value = row.timestamp ?? row.day ?? row.date;
  const date = typeof value === 'string' ? value.slice(0, 10) : '';
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;
}

function safePath(value) {
  if (typeof value !== 'string') return null;
  const path = value.split('?')[0].slice(0, 512);
  if (!path.startsWith('/') || path.startsWith('/admin') || path.startsWith('/auth') || path.startsWith('/register/verified')) return null;
  return path;
}

function metric(row, dimension, value = '') {
  const day = dayOf(row);
  if (!day) return null;
  return {
    source: 'vercel',
    bucket_day: day,
    dimension,
    dimension_value: value.slice(0, dimension === 'page' ? 512 : 255),
    page_views: Math.max(0, Number(row.pageviews) || 0),
    visitors: Math.max(0, Number(row.visitors) || 0),
  };
}

const rows = [];
for (const item of await query(['day'])) {
  const normalized = metric(item, 'overview');
  if (normalized) rows.push(normalized);
}

for (const [apiDimension, dimension, normalize] of [
  ['requestPath', 'page', safePath],
  ['referrerHostname', 'referrer', (value) => typeof value === 'string' ? value.toLowerCase().replace(/\.$/, '').slice(0, 255) : null],
  ['deviceType', 'device', (value) => typeof value === 'string' ? value.toLowerCase().slice(0, 255) : null],
]) {
  for (const item of await query(['day', apiDimension])) {
    const value = normalize(item[apiDimension]);
    if (!value || /^unknown$/i.test(value)) continue;
    const storedValue = /^others?$/i.test(value)
      ? dimension === 'page' ? 'Other pages' : dimension === 'referrer' ? 'Other referrers' : 'Other devices'
      : value;
    const normalized = metric(item, dimension, storedValue);
    if (normalized) rows.push(normalized);
  }
}

for (let offset = 0; offset < rows.length; offset += 500) {
  const { error } = await supabase.from('analytics_historical_traffic').upsert(rows.slice(offset, offset + 500), {
    onConflict: 'source,bucket_day,dimension,dimension_value',
  });
  if (error) throw new Error(`Could not store historical traffic (${error.code || 'database error'}).`);
}

const totals = rows.filter((row) => row.dimension === 'overview').reduce((sum, row) => ({
  pageViews: sum.pageViews + row.page_views,
  visitorDays: sum.visitorDays + row.visitors,
}), { pageViews: 0, visitorDays: 0 });
console.log(`Imported ${rows.length} aggregate rows from ${sinceDate} through ${untilDate}: ${totals.pageViews} page views and ${totals.visitorDays} visitor-days.`);
