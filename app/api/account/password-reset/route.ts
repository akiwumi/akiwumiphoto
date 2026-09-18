import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { siteOrigin } from '@/lib/site-origin';

export const runtime = 'nodejs';
const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const message = 'If an account exists for that email, a password reset link will be sent shortly.';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Malformed request.' }, { status: 400 }); }
  const email = normalizeEmail(body.email);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
  let supabase;
  try { supabase = await createServerClient(); } catch { return NextResponse.json({ error: 'Password reset is temporarily unavailable.' }, { status: 503 }); }
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${siteOrigin(request)}/auth/confirm?next=%2Faccount` });
  if (error?.status === 429) return NextResponse.json({ error: 'Too many reset emails have been requested. Please try again shortly.' }, { status: 429 });
  if (error) console.error('[account/password-reset] reset failed:', error.status, error.message);
  return NextResponse.json({ ok: true, message });
}
