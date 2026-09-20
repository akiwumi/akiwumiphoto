import Link from 'next/link';
import styles from '../../../Outreach.module.css';
import { getAddressBook } from '@/lib/outreach/address-book-server';
import FinalPreview from './FinalPreview';

export default async function FinalCampaignPage() {
  const contacts = await getAddressBook();
  const resendActive = process.env.OUTREACH_EMAIL_PROVIDER === 'resend' || process.env.OUTREACH_PROVIDER === 'resend' || Boolean(process.env.OUTREACH_PROVIDER_API_KEY || process.env.RESEND_API_KEY);
  return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Step 3 · final send review</p><h1 className={styles.title}>Final preview</h1><p className={styles.subtitle}>Review the exact personalized output before any campaign send.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns/new/review">Back to review</Link></header><p className={styles.notice}>{resendActive ? 'Resend is active · test the rendered message to yourself before sending to contacts.' : 'Local mock provider active · no external email is sent until Resend is configured.'}</p><FinalPreview initialContacts={contacts} resendActive={resendActive} /></div>;
}
