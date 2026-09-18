import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { siteOrigin } from '@/lib/site-origin';

export const runtime = 'nodejs';
const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';
const message = 'If this email has an account awaiting verification, a new link will be sent shortly.';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Malformed request.' }, { status: 400 }); }
  const email = normalizeEmail(body.email);
  if (!email || !/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 422 });
  let supabase;
  try { supabase = await createServerClient(); } catch { return NextResponse.json({ error: 'Verification is temporarily unavailable.' }, { status: 503 }); }
  const { error } = await supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: `${siteOrigin(request)}/auth/confirm?next=%2Faccount` } });
  if (error?.status === 429) return NextResponse.json({ error: 'Too many verification emails have been requested. Please try again shortly.' }, { status: 429 });
  if (error) console.error('[account/resend-verification] resend failed:', error.status, error.message);
  return NextResponse.json({ ok: true, message });
}
