import Link from 'next/link';
import styles from '../../Outreach.module.css';
import { ADDRESS_BOOK } from '@/lib/outreach/address-book';
import CampaignComposer from './CampaignComposer';
import { buildInteriorDesignerMailerHtml, MAILER_IMAGE_PATHS } from '@/lib/outreach/mailer-template';
import { signUrl } from '@/lib/signed-urls';

export default async function NewCampaignPage() {
  const [runningForPresident, politicalClown] = await Promise.all([
    signUrl(MAILER_IMAGE_PATHS.runningForPresident, 86400),
    signUrl(MAILER_IMAGE_PATHS.politicalClown, 86400),
  ]);
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Step 02 · campaign draft</p><h1 className={styles.title}>New campaign</h1><p className={styles.subtitle}>Prepare the approved Akiwumi Photo mailer, preview it for each recipient, then record a local test send.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns">Cancel</Link></header>
    <p className={styles.notice}>Local mock provider active · preview and test sends are personalized from the imported address book. No external email is sent from this local build.</p>
    <CampaignComposer contacts={ADDRESS_BOOK} mailerHtml={buildInteriorDesignerMailerHtml({ runningForPresident, politicalClown })} />
  </div>;
}
