import { notFound, redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase-server';
import { signUrl } from '@/lib/signed-urls';
import PrintButton from '@/app/register/receipts/[id]/PrintButton';

export const dynamic = 'force-dynamic';

export default async function AccountCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const auth = await createServerClient();
  const { data: { user } } = await auth.auth.getUser();
  if (!user?.email_confirmed_at) redirect('/account?mode=login');

  const id = (await params).id;
  const { data: certificate, error } = await auth
    .from('print_certificates')
    .select('id,registration_id,status,created_at,print_number,edition_total,order_number,location,capture_year,technical_information,image_history,image_snapshot')
    .eq('id', id)
    .single();
  if (error || !certificate) notFound();

  const image = await signUrl(certificate.image_snapshot?.storage_path);
  return <main className="certificate-page"><article className="certificate-sheet"><header><p className="certificate-brand">AKIWUMI PHOTO</p><h1>Certificate of Authenticity</h1><p>Limited edition photographic print</p></header><div className="certificate-body"><div className="certificate-photo">{image && <img src={image} alt={certificate.image_snapshot?.title || 'Registered photograph'} />}</div><dl><div><dt>Photograph</dt><dd>{certificate.image_snapshot?.title || 'Registered photograph'}</dd></div><div><dt>Print number</dt><dd>{certificate.print_number}/{certificate.edition_total}</dd></div><div><dt>Order number</dt><dd>{certificate.order_number}</dd></div><div><dt>Location</dt><dd>{certificate.location}</dd></div><div><dt>Year photograph taken</dt><dd>{certificate.capture_year}</dd></div><div><dt>Technical information</dt><dd>{certificate.technical_information}</dd></div><div><dt>History of the image</dt><dd>{certificate.image_history}</dd></div><div><dt>Registered</dt><dd>{new Date(certificate.created_at).toLocaleDateString('en-GB')}</dd></div></dl></div><footer><p>This certificate is linked to your verified print registration.</p><div className="signature-line">Signature</div><PrintButton /></footer></article></main>;
}
