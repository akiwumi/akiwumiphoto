import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) return NextResponse.json({ error: 'Sign in with a verified account first.' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const certificateId = typeof body.certificateId === 'string' ? body.certificateId : '';
  if (!certificateId) return NextResponse.json({ error: 'Certificate is required.' }, { status: 400 });
  const { error } = await supabase.from('serial_number_requests').insert({ certificate_id: certificateId, requested_by: user.id });
  if (error) {
    if (error.code === '23505') return NextResponse.json({ message: 'A serial-number request already exists for this certificate.' });
    return NextResponse.json({ error: 'We could not submit the request.' }, { status: 400 });
  }
  return NextResponse.json({ message: 'Your request was sent for review.' }, { status: 201 });
}
