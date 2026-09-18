import { serviceClient } from '@/lib/stripe';
import { SITE_URL } from '@/lib/site-origin';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Finds or provisions the Auth identity for a paid print buyer. This uses the
 * service role because Stripe webhooks have no browser session. Verification
 * delivery is best-effort: the paid order must remain settled if mail fails.
 */
export async function provisionCustomerAccount(email: string): Promise<string> {
  const normalized = normalizeEmail(email);
  if (!EMAIL_RE.test(normalized)) throw new Error('invalid_customer_email');

  const client = serviceClient();
  // The installed Supabase client exposes admin listUsers rather than a
  // getUserByEmail helper. Keep the page bounded while matching exactly after
  // normalisation; inviteUserByEmail remains the race-safe fallback.
  const existing = await client.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (existing.error) throw existing.error;
  const existingUser = existing.data.users.find((user) => normalizeEmail(user.email ?? '') === normalized);
  if (existingUser) {
    if (!existingUser.email_confirmed_at) {
      const { error } = await client.auth.resend({
        type: 'signup',
        email: normalized,
        options: { emailRedirectTo: `${SITE_URL}/auth/confirm?next=%2Faccount` },
      });
      if (error) console.warn('[account-provisioning] verification delivery failed:', error.message);
    }
    return existingUser.id;
  }

  const invited = await client.auth.admin.inviteUserByEmail(normalized, {
    redirectTo: `${SITE_URL}/auth/confirm?next=%2Faccount`,
  });
  if (invited.error || !invited.data.user) throw invited.error ?? new Error('account_provisioning_failed');
  return invited.data.user.id;
}

export async function linkPaidOrderToAccount(orderId: string, userId: string): Promise<void> {
  const { error } = await serviceClient().rpc('link_paid_order_to_user', {
    p_order_id: orderId,
    p_auth_user_id: userId,
  });
  if (error) throw error;
}
