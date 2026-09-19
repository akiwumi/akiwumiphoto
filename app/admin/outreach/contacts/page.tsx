import Link from 'next/link';
import styles from '../Outreach.module.css';
import { ADDRESS_BOOK } from '@/lib/outreach/address-book';

export default function ContactsPage() {
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Audience review</p><h1 className={styles.title}>Address book</h1><p className={styles.subtitle}>Every row requires a deliberate decision before it can enter a campaign.</p></div><Link className={styles.button} href="/admin/outreach/import">Review source sheet</Link></header>
    <section className={styles.panel}><div className={styles.panelHead}><h2 className={styles.panelTitle}>{ADDRESS_BOOK.length} imported contacts</h2><div className={styles.links}><span className={styles.chip}>All</span><span className={styles.chip}>Sweden</span><span className={styles.chip}>Denmark</span><span className={styles.chip}>Norway</span></div></div>
      <table className={styles.table}><thead><tr><th>Name / studio</th><th>Primary email</th><th>Country</th><th>Source</th><th>Approval</th></tr></thead><tbody>{ADDRESS_BOOK.map((contact) => <tr key={contact.id}><td><Link className={styles.contactLink} href={`/admin/outreach/contacts/${contact.id}`}><strong>{contact.name}</strong><br/><span>{contact.studio} · {contact.role}</span></Link></td><td><a className={styles.link} href={`mailto:${contact.email}`}>{contact.email}</a></td><td>{contact.country}</td><td><a className={styles.link} href={contact.website} target="_blank" rel="noreferrer">Website ↗</a></td><td><span className={`${styles.chip} ${styles.chipWarn}`}>needs review</span></td></tr>)}</tbody></table>
    </section>
  </div>;
}
