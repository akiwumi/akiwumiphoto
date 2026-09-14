import type { User } from '@supabase/supabase-js';

/**
 * Being signed in is not enough to be the admin: every verified collector has
 * a session too. The admin is the account whose app_metadata carries this
 * role. Only the service role can write app_metadata, and the database's
 * write policies check the same claim (migration 005).
 */
export function isAdmin(user: User | null | undefined): boolean {
  return user?.app_metadata?.role === 'admin';
}

/**
 * Set in the browser when the admin asks for a password reset email. The
 * default reset link returns a bare PKCE code with nothing saying what it was
 * for, so /auth/confirm uses this to send the admin on to choose a new
 * password rather than to the collector confirmation page.
 */
export const PASSWORD_RESET_COOKIE = 'admin_password_reset';
