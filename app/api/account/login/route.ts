import { NextResponse } from 'next/server';
import { applySupabaseAuthCookies, createServerClient, type SupabaseAuthCookie } from '@/lib/supabase-server';

export const runtime = 'nodejs';
const normalizeEmail = (value: unknown) => typeof value === 'string' ? value.trim().toLowerCase() : '';

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Malformed request.' }, { status: 400 }); }
  const email = normalizeEmail(body.email);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) return NextResponse.json({ error: 'Enter your email and password.' }, { status: 422 });
  let supabase;
  const authCookies: SupabaseAuthCookie[] = [];
  try { supabase = await createServerClient({ onSetAll: (cookies) => authCookies.push(...cookies) }); } catch { return NextResponse.json({ error: 'Account login is temporarily unavailable.' }, { status: 503 }); }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return NextResponse.json({ error: 'The email or password is incorrect.' }, { status: 401 });
  if (!data.user.email_confirmed_at) {
    if (supabase.auth.signOut) await supabase.auth.signOut();
    return NextResponse.json({ error: 'Please verify your email before signing in.', needsVerification: true }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  applySupabaseAuthCookies(response, authCookies);
  return response;
}
