import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';
import styles from '../AdminShell.module.css';
import RegistrationActions from './RegistrationActions';

export const dynamic = 'force-dynamic';
export default async function RegistrationsPage() {
  const auth = await createServerClient(); const { data: { user } } = await auth.auth.getUser();
  if (!isAdmin(user)) redirect('/admin');
  const db = serviceClient();
  const [{ data: rows }, { data: certificates }] = await Promise.all([
    db.from('purchase_messages').select('id,artwork_title,purchase_reference,purchased_on,purchased_from,payment_method,status,created_at,collector_snapshot,gallery_image_id').order('created_at',{ascending:false}),
    db.from('print_certificates').select('id,registration_id,status,created_at,print_number,edition_total,order_number').order('created_at',{ascending:false}),
  ]);
  return <main className={styles.main}><div className={styles.content}><header className={styles.header}><div><h1 className={styles.title}>Print registrations</h1><p className={styles.subtitle}>{rows?.length ?? 0} registrations · registration records and certificates</p></div><Link href="/admin/dashboard" className={styles.ghostButton}>← Dashboard</Link></header><div className={styles.contentPad}><div className={styles.panel} style={{overflowX:'auto'}}><table className={styles.dataTable}><thead><tr><th align="left">Registered</th><th align="left">Collector</th><th align="left">Photograph</th><th align="left">Purchase</th><th align="left">Receipt</th><th align="left">Certificate</th><th align="left">Actions</th></tr></thead><tbody>{(rows ?? []).map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleDateString('en-GB')}</td><td>{r.collector_snapshot?.first_name} {r.collector_snapshot?.last_name}<br/><small>{r.collector_snapshot?.email}</small></td><td>{r.artwork_title}</td><td>{r.purchased_from || 'Not provided'}<br/>{r.payment_method || 'Unknown'}</td><td><Link href={`/register/receipts/${r.id}`} className={styles.tableAction}>View / print</Link></td><td><Link href={`/admin/dashboard/registrations/${r.id}/certificate`} className={`${styles.primaryButton} ${styles.tableAction}`}>Create certificate</Link>{(certificates ?? []).filter(c=>c.registration_id===r.id).map(c=><div key={c.id} style={{marginTop:8}}><Link href={`/admin/dashboard/registrations/certificates/${c.id}`}>Certificate {c.print_number}/{c.edition_total} · {c.status}</Link></div>)}</td><td><RegistrationActions id={r.id} /></td></tr>)}</tbody></table></div></div></div></main>;
}
