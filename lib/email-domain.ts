import { resolveMx, resolve4, resolve6 } from 'node:dns/promises';

/**
 * Checks that the address could actually receive our verification email.
 * A syntactically perfect address at a domain nobody hosts mail for is the
 * most common way a form gets filled with plausible-looking nonsense.
 *
 * Falls back to A/AAAA records because a domain with no MX but an address
 * record is still a valid mail destination under RFC 5321.
 */
export async function emailDomainAcceptsMail(email: string): Promise<boolean> {
  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (!domain) return false;

  try {
    const mx = await resolveMx(domain);
    if (mx.some((record) => record.exchange)) return true;
  } catch {
    // NXDOMAIN or no MX record — fall through to the address-record check.
  }

  const addressLookups = await Promise.allSettled([resolve4(domain), resolve6(domain)]);
  return addressLookups.some((r) => r.status === 'fulfilled' && r.value.length > 0);
}
