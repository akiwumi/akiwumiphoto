import Link from 'next/link';
import styles from '../Outreach.module.css';
import SentTable from './SentTable';
import { getAddressBook } from '@/lib/outreach/address-book-server';

export default async function SentPage() {
  const contacts = await getAddressBook();
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Delivery history · local build</p><h1 className={styles.title}>Sent</h1><p className={styles.subtitle}>A record of personalized messages recorded by the local mock provider. No external email is delivered from this build.</p></div><Link className={styles.button} href="/admin/outreach/campaigns/new">New campaign</Link></header>
    <section className={styles.panel}><div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Sent messages</h2><p className={styles.panelMeta}>Recipient history is also highlighted in the address book to prevent duplicates.</p></div><span className={`${styles.chip} ${styles.chipGood}`}>local records</span></div><SentTable contacts={contacts} /></section>
  </div>;
}
