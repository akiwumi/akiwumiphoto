import Link from 'next/link';
import styles from '../Outreach.module.css';
import { getAddressBook } from '@/lib/outreach/address-book-server';
import ContactsTable from './ContactsTable';

export default async function ContactsPage() {
  const contacts = await getAddressBook();
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Supabase address book</p><h1 className={styles.title}>Address book</h1><p className={styles.subtitle}>Imported contacts are available immediately for search, editing, personalization, and campaign selection.</p></div><Link className={styles.button} href="/admin/outreach/import">Import workbook</Link></header>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>{contacts.length} imported contacts</h2><div className={styles.links}><span className={styles.chip}>All</span><span className={styles.chip}>Sweden</span><span className={styles.chip}>Denmark</span><span className={styles.chip}>Norway</span></div></div>
      <ContactsTable contacts={contacts} />
    </section>
  </div>;
}
