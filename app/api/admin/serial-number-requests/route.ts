import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';

export async function POST(request: Request) {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!isAdmin(user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({}));
  const requestId = typeof body.requestId === 'string' ? body.requestId : '';
  const decision = body.decision === 'approved' ? 'approved' : body.decision === 'denied' ? 'denied' : '';
  if (!requestId || !decision) return NextResponse.json({ error: 'Request and decision are required.' }, { status: 400 });
  const db = serviceClient();
  const { data: serialRequest } = await db.from('serial_number_requests').select('id,certificate_id,status').eq('id', requestId).single();
  if (!serialRequest) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  let serialNumber: string | null = null;
  if (decision === 'approved') {
    const { data: certificate } = await db.from('print_certificates').select('serial_id').eq('id', serialRequest.certificate_id).single();
    if (!certificate) return NextResponse.json({ error: 'Certificate not found.' }, { status: 404 });
    const { data: serial } = await db.from('photo_serial_numbers').select('serial_number').eq('id', certificate.serial_id).single();
    serialNumber = serial?.serial_number ?? null;
    if (!serialNumber) return NextResponse.json({ error: 'Serial number is unavailable.' }, { status: 409 });
  }
  const { error } = await db.from('serial_number_requests').update({ status: decision, serial_number: serialNumber, reviewed_at: new Date().toISOString(), reviewed_by: user?.id }).eq('id', requestId);
  if (error) return NextResponse.json({ error: 'Could not update request.' }, { status: 400 });
  return NextResponse.json({ status: decision, serialNumber });
}
