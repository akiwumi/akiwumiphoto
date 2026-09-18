import { NextResponse } from 'next/server';
import { applySupabaseAuthCookies, createServerClient, type SupabaseAuthCookie } from '@/lib/supabase-server';
import { validateCollector } from '@/lib/collector-validation';
import { emailDomainAcceptsMail } from '@/lib/email-domain';
import { siteOrigin } from '@/lib/site-origin';

// node:dns is not available on the edge, and the DNS check is the point.
export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 });
  }

  // Honeypot — same pattern as the contact form. Bots get a success they
  // cannot distinguish from the real thing, and nothing is written.
  if (typeof body.botcheck === 'string' && body.botcheck !== '') {
    return NextResponse.json({ ok: true, status: 'verification_sent' });
  }

  const { values, errors } = validateCollector(body);
  if (Object.keys(errors).length > 0) {
    return NextResponse.json({ errors }, { status: 422 });
  }

  if (!(await emailDomainAcceptsMail(values.email))) {
    return NextResponse.json(
      { errors: { email: 'That email domain does not accept mail. Please check the address.' } },
      { status: 422 },
    );
  }

  let supabase;
  const authCookies: SupabaseAuthCookie[] = [];
  try {
    supabase = await createServerClient({ onSetAll: (cookies) => authCookies.push(...cookies) });
  } catch (err) {
    console.error('[register] Supabase is not configured:', err);
    return NextResponse.json({ error: 'Registration is unavailable right now.' }, { status: 503 });
  }

  // register_collector is a SECURITY DEFINER function: the collector has no
  // account yet, so there is no session for RLS to authorise the write with.
  const { data: outcome, error: writeError } = await supabase.rpc('register_collector', {
    p_email: values.email,
    p_first_name: values.first_name,
    p_last_name: values.last_name,
    p_phone: values.phone,
    p_address_line1: values.address_line1,
    p_address_line2: values.address_line2,
    p_city: values.city,
    p_region: values.region,
    p_postcode: values.postcode,
    p_country_code: values.country_code,
  });

  if (writeError) {
    console.error('[register] Could not save the collector record:', writeError);
    return NextResponse.json({ error: 'Your details could not be saved. Please try again.' }, { status: 500 });
  }

  // Supabase Auth sends the confirmation email and owns the token behind the
  // link, so the details are validated and stored before any email goes out.
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email: values.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${siteOrigin(request)}/auth/confirm`,
      data: { first_name: values.first_name, last_name: values.last_name },
    },
  });

  if (otpError) {
    console.error('[register] Could not send the verification email:', otpError.status, otpError.message);
    // Supabase throttles its own sender; say so rather than blaming the address.
    const throttled = otpError.status === 429;
    return NextResponse.json(
      {
        error: throttled
          ? 'Too many verification emails have been requested. Please wait a few minutes and try again.'
          : 'Your details were saved, but the verification email could not be sent. Please try again shortly.',
      },
      { status: throttled ? 429 : 502 },
    );
  }

  const response = NextResponse.json({
    ok: true,
    status: outcome === 'already_verified' ? 'already_registered' : 'verification_sent',
    email: values.email,
  });
  applySupabaseAuthCookies(response, authCookies);
  return response;
}
