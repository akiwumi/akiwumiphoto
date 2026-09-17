import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { isAdmin } from '@/lib/admin-auth';
import { serviceClient } from '@/lib/stripe';
import { signUrl } from '@/lib/signed-urls';
import PrintButton from '@/app/register/receipts/[id]/PrintButton';

export const dynamic = 'force-dynamic';

export default async function CertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await createServerClient(); const { data: { user } } = await auth.auth.getUser();
  if (!isAdmin(user)) redirect('/admin');
  const { data: c } = await serviceClient().from('print_certificates').select('*, purchase_messages(*), gallery_images(storage_path,title), print_sizes(name,dimensions,edition_size), photo_serial_numbers(serial_number)').eq('id', (await params).id).single();
  if (!c) notFound();
  const image = await signUrl(c.image_snapshot?.storage_path || c.gallery_images?.storage_path);
  return <main className="certificate-page"><article className="certificate-sheet"><header><p className="certificate-brand">AKIWUMI PHOTO</p><h1>Certificate of Authenticity</h1><p>Limited edition photographic print</p></header><div className="certificate-body"><div className="certificate-photo">{image && <img src={image} alt={c.image_snapshot?.title || c.gallery_images?.title || 'Registered photograph'} />}</div><dl><div><dt>Photograph</dt><dd>{c.image_snapshot?.title || c.gallery_images?.title || c.purchase_messages?.artwork_title}</dd></div><div><dt>Serial number</dt><dd>{c.photo_serial_numbers?.serial_number}</dd></div><div><dt>Print number</dt><dd>{c.print_number}/{c.edition_total}</dd></div><div><dt>Order number</dt><dd>{c.order_number}</dd></div><div><dt>Location</dt><dd>{c.location}</dd></div><div><dt>Year photograph taken</dt><dd>{c.capture_year}</dd></div><div><dt>Technical information</dt><dd>{c.technical_information}</dd></div><div><dt>History of the image</dt><dd>{c.image_history}</dd></div><div><dt>Registered</dt><dd>{new Date(c.created_at).toLocaleDateString('en-GB')}</dd></div></dl></div><footer><p>This certificate is linked to registration <strong>{c.registration_id}</strong> in the Akiwumi Photo registration database.</p><div className="signature-line">Signature</div><PrintButton /></footer></article></main>;
}
