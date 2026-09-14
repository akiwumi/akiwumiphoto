import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { siteOrigin } from '@/lib/site-origin';
import { PASSWORD_RESET_COOKIE } from '@/lib/admin-auth';

/**
 * Where the link in a Supabase Auth email lands: collector verification, and
 * the admin's password reset.
 *
 * Two shapes are accepted because the shape depends on the Supabase email
 * template:
 *   token_hash — the template uses {{ .TokenHash }}. Stateless, so the link
 *                works even if the collector opens their email on a different
 *                device from the one they registered on. This is the one to use.
 *   code       — the default {{ .ConfirmationURL }} template, which returns a
 *                PKCE code. It only verifies in the browser that started the
 *                registration, because that is where the verifier cookie is.
 *
 * A code carries no hint of which email it came from, so a password reset is
 * recognised by the cookie the admin login page sets when requesting one.
 */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');

  const resettingPassword =
    type === 'recovery' || request.cookies.get(PASSWORD_RESET_COOKIE)?.value === '1';

  const go = (path: string) => {
    const response = NextResponse.redirect(`${origin}${path}`);
    if (resettingPassword) response.cookies.delete(PASSWORD_RESET_COOKIE);
    return response;
  };

  const success = () => go(resettingPassword ? '/admin/reset-password' : '/register/verified');
  const failure = (reason: string) =>
    go(resettingPassword ? `/admin/reset-password?error=${reason}` : `/register?verify=${reason}`);

  // Supabase reports a rejected or expired link before it ever reaches us.
  if (params.get('error')) {
    const description = params.get('error_description') ?? '';
    return failure(/expired/i.test(description) ? 'expired' : 'failed');
  }

  let supabase;
  try {
    supabase = await createServerClient();
  } catch {
    return failure('unavailable');
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (error) {
      console.error('[auth/confirm] verifyOtp rejected the link:', error.status, error.message);
      return failure(error.status === 403 ? 'expired' : 'failed');
    }
    return success();
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/confirm] Code exchange failed:', error.status, error.message);
      return failure('device');
    }
    return success();
  }

  return failure('failed');
}
