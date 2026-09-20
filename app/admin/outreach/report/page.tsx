import { getDeliveryReport } from '@/lib/outreach/delivery-report';
import DeliveryReportTable from './DeliveryReportTable';
import styles from '../Outreach.module.css';

export default async function DeliveryReportPage() {
  const rows = await getDeliveryReport();
  const count = (status: string) => rows.filter((row) => row.status === status).length;
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Outreach reporting · Supabase + provider events</p><h1 className={styles.title}>Delivery report</h1><p className={styles.subtitle}>Track every recorded recipient from submission through delivery, opens, clicks, bounces, and failures.</p></div></header>
    <section className={styles.grid}>{[['Total sent', String(rows.length), 'Recorded provider deliveries'], ['Delivered', String(count('delivered')), 'Provider confirmed'], ['Opened', String(count('opened')), 'Tracked opens'], ['Bounced / failed', String(count('bounced') + count('failed')), 'Needs attention']].map(([label, value, meta]) => <article className={styles.stat} key={label}><div className={styles.statLabel}>{label}</div><div className={styles.statValue}>{value}</div><div className={styles.statMeta}>{meta}</div></article>)}</section>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Recipient status</h2><p className={styles.panelMeta}>Statuses update when the email provider posts webhook events. Filter or sort by date sent below.</p></div><span className={styles.chip}>{rows.length} records</span></div>{rows.length === 0 ? <div className={styles.emptyState}>No provider deliveries have been recorded yet. Send a campaign after configuring Resend, then configure its webhook to this endpoint: <code>/api/admin/outreach/webhooks/resend</code>.</div> : <DeliveryReportTable rows={rows} />}</section>
  </div>;
}
