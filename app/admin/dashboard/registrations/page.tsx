import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';

export const dynamic = 'force-dynamic';
export default async function RegistrationsPage() {
  const auth = await createServerClient(); const { data: { user } } = await auth.auth.getUser();
  if (!isAdmin(user)) redirect('/admin');
  const { data: rows } = await serviceClient().from('purchase_messages').select('id,artwork_title,purchase_reference,purchased_on,purchased_from,payment_method,status,created_at,collector_snapshot').order('created_at',{ascending:false});
  return <main style={{padding:'48px',fontFamily:'Arial',background:'#111',color:'#fff',minHeight:'100vh'}}><Link href="/admin/dashboard" style={{color:'#fff'}}>← Dashboard</Link><h1>Print registrations</h1><p>{rows?.length ?? 0} registrations</p><table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr><th align="left">Registered</th><th align="left">Collector</th><th align="left">Photograph</th><th align="left">Purchase</th><th align="left">Receipt</th></tr></thead><tbody>{(rows ?? []).map(r=><tr key={r.id}><td>{new Date(r.created_at).toLocaleDateString('en-GB')}</td><td>{r.collector_snapshot?.first_name} {r.collector_snapshot?.last_name}<br/><small>{r.collector_snapshot?.email}</small></td><td>{r.artwork_title}</td><td>{r.purchased_from || 'Not provided'}<br/>{r.payment_method || 'Unknown'}</td><td><Link href={`/register/receipts/${r.id}`} target="_blank" style={{color:'#fff'}}>View / print</Link></td></tr>)}</tbody></table></main>;
}
