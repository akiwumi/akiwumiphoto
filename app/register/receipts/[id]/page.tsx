import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { serviceClient } from '@/lib/stripe';
import { receiptFields, type PrintRegistration } from '@/lib/registration-receipt';
import PrintButton from './PrintButton';

export const dynamic = 'force-dynamic';

export default async function RegistrationReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user) redirect('/register');
  const { data } = await serviceClient().from('purchase_messages').select('*').eq('id', id).single();
  if (!data || data.collector_snapshot?.email !== user.email) notFound();
  const fields = receiptFields(data as PrintRegistration);
  return <main className="register-page receipt-print-page"><article className="register-panel receipt-sheet"><p className="receipt-kicker">AKIWUMI PHOTO</p><h1>Print registration receipt</h1><p>Registration details recorded from your verified account.</p><dl className="register-summary">{fields.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="register-hint">This receipt records the details supplied by the collector. It does not confirm payment or authenticate the artwork.</p><PrintButton /></article></main>;
}
