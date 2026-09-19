import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';
import CertificateAdmin from '../../CertificateAdmin';
import styles from '../../../AdminShell.module.css';

export const dynamic = 'force-dynamic';
export default async function CreateCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await createServerClient(); const { data: { user } } = await auth.auth.getUser(); if (!isAdmin(user)) redirect('/admin');
  const id = (await params).id; const db = serviceClient();
  const [{ data: registration }, { data: images }, { data: sizes }, { data: certificates }] = await Promise.all([
    db.from('purchase_messages').select('*').eq('id', id).single(),
    db.from('gallery_images').select('id,title,storage_path').order('title'),
    db.from('print_sizes').select('id,name,dimensions,edition_size').eq('active',true).order('sort_order'),
    db.from('print_certificates').select('id,registration_id,status,created_at,print_number,edition_total,order_number').eq('registration_id',id).order('created_at',{ascending:false}),
  ]);
  if (!registration) notFound();
  return <div className={styles.content}><header className={styles.header}><div><h1 className={styles.title}>Create print certificate</h1><p className={styles.subtitle}>{registration.artwork_title} · {registration.collector_snapshot?.email}</p></div><Link href="/admin/dashboard/registrations" className={styles.ghostButton}>← All registrations</Link></header><div className={styles.contentPad}><div className={styles.panel}><CertificateAdmin registration={registration} images={images ?? []} sizes={sizes ?? []} certificates={certificates ?? []} standalone /></div></div></div>;
}
