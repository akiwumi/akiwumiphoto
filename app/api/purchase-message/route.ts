import { after, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { validatePurchaseMessage } from '@/lib/collector-validation';
import { serviceClient } from '@/lib/stripe';
import { sendRegistrationReceipt } from '@/lib/registration-email';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  if (typeof body.botcheck === 'string' && body.botcheck !== '') {
    return NextResponse.json({ ok: true });
  }

  let supabase;
  try {
    supabase = await createServerClient();
  } catch (err) {
    console.error('[purchase-message] Supabase is not configured:', err);
    return NextResponse.json({ error: 'Messaging is unavailable right now.' }, { status: 503 });
  }

  // Identity comes from the verified session, never from the form. The insert
  // runs as the collector too, so RLS — not this handler — is what guarantees
  // a message can only ever be filed against the sender's own record.
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: 'Your session has expired. Open the link in your verification email again.' },
      { status: 401 },
    );
  }

  const { values, errors } = validatePurchaseMessage(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  const { data: collector, error: lookupError } = await supabase
    .from('collectors')
    .select('id, email_verified')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  if (lookupError) {
    console.error('[purchase-message] Could not read the collector record:', lookupError);
    return NextResponse.json({ error: 'Messaging is unavailable right now.' }, { status: 503 });
  }

  if (!collector?.email_verified) {
    return NextResponse.json(
      { error: 'Please complete your registration before sending a message.' },
      { status: 403 },
    );
  }

  const { data: saved, error: writeError } = await supabase.rpc('submit_print_registration', {
    p_submission_id: typeof body.submission_id === 'string' ? body.submission_id : crypto.randomUUID(),
    p_artwork_title: values.artwork_title,
    p_purchase_reference: values.purchase_reference,
    p_purchased_on: values.purchased_on,
    p_purchased_from: values.purchased_from,
    p_payment_method: values.payment_method,
    p_message: values.message,
    p_gallery_image_id: values.gallery_image_id,
  });

  if (writeError) {
    console.error('[purchase-message] Could not save the message:', writeError);
    return NextResponse.json({ error: 'Your message could not be sent. Please try again.' }, { status: 500 });
  }

  const registration = saved as Record<string, unknown>;
  after(async () => {
    const { data } = await serviceClient().from('purchase_messages').select('*').eq('id', registration.id).single();
    if (data) await sendRegistrationReceipt(data as never);
  });
  return NextResponse.json({ ok: true, reference: registration.id, received_at: registration.created_at });
}
