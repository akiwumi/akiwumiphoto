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
  const existingUser = await findUserByEmail(client, normalized);
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
  // A concurrent webhook may have created the account between our lookup and
  // invite. Re-read before treating an invite error as a provisioning error.
  if (invited.error) {
    const racedUser = await findUserByEmail(client, normalized);
    if (racedUser) return racedUser.id;
    throw invited.error;
  }
  if (!invited.data.user) throw new Error('account_provisioning_failed');
  return invited.data.user.id;
}

async function findUserByEmail(client: ReturnType<typeof serviceClient>, email: string) {
  // listUsers is paginated and the SDK has no getUserByEmail helper. Continue
  // until the exact normalized email is found or all pages are exhausted.
  for (let page = 1; ; page += 1) {
    const result = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (result.error) throw result.error;
    const user = result.data.users.find((candidate) => normalizeEmail(candidate.email ?? '') === email);
    if (user) return user;
    if (result.data.users.length < 1000) return null;
  }
}

export async function linkPaidOrderToAccount(orderId: string, userId: string): Promise<void> {
  const { error } = await serviceClient().rpc('link_paid_order_to_user', {
    p_order_id: orderId,
    p_auth_user_id: userId,
  });
  if (error) throw error;
}
