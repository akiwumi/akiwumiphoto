/**
 * Web3Forms only accepts submissions from the browser on the free plan, so
 * this runs client-side. The access key is public by their design; which
 * inbox a submission lands in is bound to the key itself.
 */
const ENDPOINT = 'https://api.web3forms.com/submit';

export async function sendWeb3Form(fields: Record<string, string>): Promise<boolean> {
  const accessKey = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;
  if (!accessKey) {
    console.error('[web3forms] NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is not set');
    return false;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ access_key: accessKey, botcheck: false, ...fields }),
    });
    // Rejections are reported in the body, so an ok status is not enough.
    const data = await res.json().catch(() => null);
    if (res.ok && data?.success) return true;
    console.error('[web3forms] submission rejected:', res.status, data?.message);
    return false;
  } catch (err) {
    console.error('[web3forms] could not reach the service:', err);
    return false;
  }
}
