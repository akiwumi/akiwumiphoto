/**
 * The canonical public address. Search engines and link previews are always
 * pointed here, whatever host a request arrived on, so the bare domain's
 * redirect never ends up in the sitemap or in shared-link metadata.
 */
export const SITE_URL = 'https://www.akiwumiphoto.com';

/**
 * Where to send the collector back to after they click the link in their
 * email. Prefers an explicit setting so the link survives being generated
 * behind a proxy or a preview deployment.
 */
export function siteOrigin(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, '');
  return new URL(request.url).origin;
}
