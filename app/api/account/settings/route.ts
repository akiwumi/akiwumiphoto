import { NextResponse } from 'next/server';
import { applySupabaseAuthCookies, createServerClient, type SupabaseAuthCookie } from '@/lib/supabase-server';
import { isCountryCode } from '@/lib/countries';
import { normalisePhone } from '@/lib/collector-validation';

export const runtime = 'nodejs';

const clean = (value: unknown) => typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';

export async function PATCH(request: Request) {
  let body: Record<string, unknown>;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Malformed request.' }, { status: 400 }); }
  const authCookies: SupabaseAuthCookie[] = [];
  let supabase;
  try { supabase = await createServerClient({ onSetAll: (cookies) => authCookies.push(...cookies) }); } catch { return NextResponse.json({ error: 'Account settings are temporarily unavailable.' }, { status: 503 }); }
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email_confirmed_at) return NextResponse.json({ error: 'Sign in with a verified account first.' }, { status: 401 });

  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : '';
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : '';
  if (newPassword || currentPassword) {
    if (!currentPassword || newPassword.length < 8) return NextResponse.json({ error: 'Enter your current password and a new password of at least 8 characters.' }, { status: 422 });
    const verified = await supabase.auth.signInWithPassword({ email: user.email ?? '', password: currentPassword });
    if (verified.error || !verified.data.user) return NextResponse.json({ error: 'Your current password could not be verified.' }, { status: 403 });
    const changed = await supabase.auth.updateUser({ password: newPassword });
    if (changed.error) return NextResponse.json({ error: 'Your password could not be updated.' }, { status: 422 });
  }

  const fields = {
    first_name: clean(body.first_name), last_name: clean(body.last_name), phone: normalisePhone(body.phone),
    address_line1: clean(body.address_line1), address_line2: clean(body.address_line2) || null,
    city: clean(body.city), region: clean(body.region) || null, postcode: clean(body.postcode), country_code: clean(body.country_code).toUpperCase(),
  };
  const invalid = !fields.first_name || fields.first_name.length > 60 || !fields.last_name || fields.last_name.length > 60 || !/^\+[1-9][0-9]{6,14}$/.test(fields.phone) || fields.address_line1.length < 4 || fields.address_line1.length > 120 || fields.city.length < 2 || fields.city.length > 80 || fields.postcode.length < 2 || fields.postcode.length > 16 || !isCountryCode(fields.country_code);
  if (invalid) return NextResponse.json({ error: 'Check your name, phone, address, postcode and country details.' }, { status: 422 });
  const { error } = await supabase.from('collectors').update(fields).eq('auth_user_id', user.id).eq('email_verified', true);
  if (error) return NextResponse.json({ error: 'Your registered details could not be updated.' }, { status: 500 });
  const response = NextResponse.json({ ok: true, message: newPassword ? 'Your details and password have been updated.' : 'Your registered details have been updated.' });
  applySupabaseAuthCookies(response, authCookies);
  return response;
}
