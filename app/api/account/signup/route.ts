import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { siteOrigin } from '@/lib/site-origin';

export const runtime = 'nodejs';

const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const GENERIC = 'If this email can be registered, a verification link will be sent shortly.';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Malformed request.' }, { status: 400 }); }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8) {
    return NextResponse.json({ error: 'Enter a valid email and a password of at least 8 characters.' }, { status: 422 });
  }
  let supabase;
  try { supabase = await createServerClient(); } catch (error) {
    console.error('[account/signup] Supabase unavailable:', error);
    return NextResponse.json({ error: 'Account registration is temporarily unavailable.' }, { status: 503 });
  }
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteOrigin(request)}/auth/confirm?next=%2Faccount` },
  });
  if (error) {
    // Do not disclose whether an account exists at this address.
    if (error.status !== 429) return NextResponse.json({ ok: true, message: GENERIC });
    return NextResponse.json({ error: 'Too many verification emails have been requested. Please try again shortly.' }, { status: 429 });
  }
  return NextResponse.json({ ok: true, message: GENERIC });
}
