import { NextResponse, type NextRequest } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@/lib/supabase-server';
import { siteOrigin } from '@/lib/site-origin';

/**
 * Where the link in the verification email lands.
 *
 * Two shapes are accepted because the shape depends on the Supabase email
 * template:
 *   token_hash — the template uses {{ .TokenHash }}. Stateless, so the link
 *                works even if the collector opens their email on a different
 *                device from the one they registered on. This is the one to use.
 *   code       — the default {{ .ConfirmationURL }} template, which returns a
 *                PKCE code. It only verifies in the browser that started the
 *                registration, because that is where the verifier cookie is.
 */
export async function GET(request: NextRequest) {
  const origin = siteOrigin(request);
  const params = request.nextUrl.searchParams;
  const tokenHash = params.get('token_hash');
  const type = params.get('type') as EmailOtpType | null;
  const code = params.get('code');

  const failure = (reason: string) =>
    NextResponse.redirect(`${origin}/register?verify=${reason}`);

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
    return NextResponse.redirect(`${origin}/register/verified`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('[auth/confirm] Code exchange failed:', error.status, error.message);
      return failure('device');
    }
    return NextResponse.redirect(`${origin}/register/verified`);
  }

  return failure('failed');
}
