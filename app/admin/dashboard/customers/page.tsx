import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';
import styles from '../AdminShell.module.css';
import SerialRequestReview from './SerialRequestReview';

export const dynamic = 'force-dynamic';

export default async function CustomersPage() {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!isAdmin(user)) redirect('/admin');
  const db = serviceClient();
  const [{ data: collectors }, { data: orders }, { data: registrations }, { data: certificates }, { data: requests }] = await Promise.all([
    db.from('collectors').select('*').order('created_at', { ascending: false }),
    db.from('print_orders').select('*').order('created_at', { ascending: false }),
    db.from('purchase_messages').select('*').order('created_at', { ascending: false }),
    db.from('print_certificates').select('*,photo_serial_numbers(serial_number)').order('created_at', { ascending: false }),
    db.from('serial_number_requests').select('*').order('requested_at', { ascending: false }),
  ]);
  const orderByEmail = new Map<string, any[]>();
  for (const order of orders ?? []) { const email = String(order.email ?? '').toLowerCase(); if (!orderByEmail.has(email)) orderByEmail.set(email, []); orderByEmail.get(email)!.push(order); }
  return <main className={styles.main}><div className={styles.content}><header className={styles.header}><div><h1 className={styles.title}>Registered users</h1><p className={styles.subtitle}>{collectors?.length ?? 0} collector accounts · purchases, registrations and serial numbers</p></div><Link href="/admin/dashboard/registrations" className={styles.ghostButton}>← Registrations</Link></header><div className={styles.contentPad}><div className={styles.panel} style={{ display: 'grid', gap: 24 }}>{(collectors ?? []).map((collector) => { const email = String(collector.email ?? '').toLowerCase(); const userOrders = orderByEmail.get(email) ?? []; const userRegs = (registrations ?? []).filter((r) => r.collector_id === collector.id); const userCerts = (certificates ?? []).filter((c) => userRegs.some((r) => r.id === c.registration_id)); const userRequests = (requests ?? []).filter((request) => userCerts.some((cert) => cert.id === request.certificate_id)); return <section key={collector.id} style={{ borderTop: '1px solid rgba(255,255,255,.18)', paddingTop: 20 }}><h2>{collector.first_name} {collector.last_name}</h2><p>{collector.email} · {collector.phone} · {collector.country_code}</p><p>{collector.address_line1}, {collector.city} {collector.postcode}</p><h3>Paid purchases ({userOrders.length})</h3>{userOrders.length === 0 ? <p>No linked paid order.</p> : <ul>{userOrders.map((order) => <li key={order.id}><strong>{order.reference}</strong> · {order.status} · {order.currency} {order.total_usd} + shipping {order.shipping_usd}<pre style={{ whiteSpace: 'pre-wrap', fontSize: 12 }}>{JSON.stringify({ shipping_address: order.shipping_address, lines: order.lines }, null, 2)}</pre></li>)}</ul>}<h3>Registrations ({userRegs.length})</h3>{userRegs.length === 0 ? <p>No print registrations.</p> : <ul>{userRegs.map((reg) => <li key={reg.id}>{reg.artwork_title} · {reg.purchase_reference || 'No purchase reference'} · {reg.status}</li>)}</ul>}<h3>Certificates and serial numbers ({userCerts.length})</h3>{userCerts.length === 0 ? <p>No certificates.</p> : <ul>{userCerts.map((cert) => <li key={cert.id}>{cert.image_snapshot?.title || 'Print'} · {cert.order_number} · {cert.print_number}/{cert.edition_total} · serial <strong>{cert.photo_serial_numbers?.serial_number || 'Unavailable'}</strong></li>)}</ul>}<h3>Serial-number requests</h3>{userRequests.length === 0 ? <p>No requests.</p> : <ul>{userRequests.map((request) => <li key={request.id}><SerialRequestReview requestId={request.id} status={request.status} /> · {request.requested_at}</li>)}</ul>}</section>; })}</div></div></div></main>;
}
