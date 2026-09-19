import Link from 'next/link';
import styles from '../Outreach.module.css';
import CampaignsClient from './CampaignsClient';

export default function CampaignsPage() { return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Step 02 · campaigns</p><h1 className={styles.title}>Campaigns</h1><p className={styles.subtitle}>Draft, inspect, test, then queue only the people you have approved.</p></div><Link className={styles.button} href="/admin/outreach/campaigns/new">New campaign</Link></header><CampaignsClient /></div>; }
