'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, Eye, Globe2, MousePointerClick, Users, type LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { AnalyticsSummary } from '@/lib/analytics-dashboard';
import shell from '../AdminShell.module.css';
import styles from './AnalyticsDashboard.module.css';

const n = (value: unknown) => new Intl.NumberFormat().format(Number(value || 0));
const pct = (a: number, b: number) => b ? `${Math.round((a / b) * 100)}%` : '—';

export default function AnalyticsDashboard({ initial, demo }: { initial: AnalyticsSummary; demo: boolean }) {
  const router = useRouter();
  const [range, setRange] = useState('30');
  const max = useMemo(() => Math.max(1, ...initial.daily.map((d) => d.page_views)), [initial.daily]);
  const headline = initial.headline;
  const changeRange = (days: string) => { setRange(days); const end = new Date(); const start = new Date(end.getTime() - Number(days) * 86400000); router.push(`/admin/dashboard/analytics?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`); };
  const metrics: Array<[string, number, LucideIcon]> = [['Unique visitors', Number(headline.unique_visitors || 0), Users], ['Sessions', Number(headline.sessions || 0), MousePointerClick], ['Page views', Number(headline.page_views || 0), Eye], ['Paid orders', Number(headline.completed_payments || 0), Globe2]];
  return <div className={shell.content}>
    <header className={shell.header}><div><h1 className={shell.title}>Analytics</h1><p className={shell.subtitle}>Understand how visitors discover and use your portfolio.</p></div><div className={shell.headerActions}><label className={styles.range}><CalendarDays size={16} /><span className={styles.srOnly}>Date range</span><select value={range} onChange={(e) => changeRange(e.target.value)}><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last 12 months</option></select></label></div></header>
    <div className={`${shell.contentPad} ${styles.dashboard}`}>
      {demo && <div className={shell.notice}>Demo data — connect Supabase to see live traffic.</div>}
      <section className={styles.metricGrid}>{metrics.map(([label, value, Icon]) => <article className={styles.metric} key={label}><Icon size={18} /><span>{label}</span><strong>{n(value)}</strong></article>)}</section>
      <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Daily traffic</h2><p>Page views, sessions and unique visitors</p></div></div>{initial.daily.length === 0 ? <p className={styles.empty}>No traffic in this period.</p> : <div className={styles.chart}>{initial.daily.map((day) => <div className={styles.barGroup} key={day.day} title={`${day.day}: ${n(day.page_views)} page views`}><div className={styles.bar} style={{ height: `${Math.max(4, day.page_views / max * 100)}%` }} /><small>{day.day.slice(5)}</small></div>)}</div>}</section>
      <div className={styles.twoCol}><List title="Top pages" rows={initial.top_pages.map((r) => [r.path, r.events])} /><List title="Referrers" rows={initial.top_referrers.map((r) => [r.referrer_origin, r.events])} /><List title="Devices" rows={initial.top_devices.map((r) => [r.device_class, r.events])} /></div>
      <section className={styles.panel}><div className={styles.panelHeader}><div><h2>Funnels</h2><p>Distinct sessions moving through key actions</p></div></div><div className={styles.funnels}><Funnel title="Visit → gallery" steps={[["Visits", initial.funnels.visit_to_gallery.visits], ["Gallery interactions", initial.funnels.visit_to_gallery.gallery_interactions]]} /><Funnel title="Gallery → paid" steps={[["Gallery interactions", initial.funnels.gallery_to_paid.gallery_interactions], ["Checkout starts", initial.funnels.gallery_to_paid.checkout_starts], ["Paid orders", initial.funnels.gallery_to_paid.paid_orders]]} /><Funnel title="Visit → registration" steps={[["Visits", initial.funnels.visit_to_registration.visits], ["Registrations", initial.funnels.visit_to_registration.registrations]]} /></div></section>
    </div>
  </div>;
}

function List({ title, rows }: { title: string; rows: [string, number][] }) { return <section className={styles.panel}><h2>{title}</h2>{rows.length ? <ol className={styles.list}>{rows.map(([name, count]) => <li key={name}><span title={name}>{name}</span><strong>{n(count)}</strong></li>)}</ol> : <p className={styles.empty}>No data.</p>}</section>; }
function Funnel({ title, steps }: { title: string; steps: [string, number][] }) { return <div className={styles.funnel}><h3>{title}</h3>{steps.map(([label, value], i) => <div className={styles.funnelStep} key={label}><span>{label}</span><strong>{n(value)} {i > 0 && <em>{pct(value, steps[i - 1][1])}</em>}</strong></div>)}</div>; }
