import Link from 'next/link';
import styles from '../../../Outreach.module.css';
import { ADDRESS_BOOK } from '@/lib/outreach/address-book';
import CampaignComposer from '../CampaignComposer';
import { buildInteriorDesignerMailerHtml, MAILER_IMAGE_PATHS } from '@/lib/outreach/mailer-template';
import { signUrl } from '@/lib/signed-urls';

export default async function ReviewCampaignPage() {
  const [runningForPresident, politicalClown] = await Promise.all([signUrl(MAILER_IMAGE_PATHS.runningForPresident, 86400), signUrl(MAILER_IMAGE_PATHS.politicalClown, 86400)]);
  return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Step 2 · copy and preview</p><h1 className={styles.title}>Review email</h1><p className={styles.subtitle}>Edit the message and inspect a personalized preview before opening the final send review.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns/new">Back to recipients</Link></header><p className={styles.notice}>Local mock provider active · your edits are saved in this browser. No external email is sent from this local build.</p><CampaignComposer contacts={ADDRESS_BOOK} mailerHtml={buildInteriorDesignerMailerHtml({ runningForPresident, politicalClown })} /></div>;
}
