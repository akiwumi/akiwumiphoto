import Link from 'next/link';
import styles from '../../Outreach.module.css';
import { getAddressBook } from '@/lib/outreach/address-book-server';
import { getOutreachContactCategories } from '@/lib/outreach/categories-server';
import CampaignAudience from './CampaignAudience';
import { buildInteriorDesignerMailerHtml, MAILER_IMAGE_PATHS } from '@/lib/outreach/mailer-template';
import { signUrl } from '@/lib/signed-urls';

export default async function NewCampaignPage() {
  const [contacts, categories, runningForPresident, politicalClown] = await Promise.all([
    getAddressBook(),
    getOutreachContactCategories(),
    signUrl(MAILER_IMAGE_PATHS.runningForPresident, 86400),
    signUrl(MAILER_IMAGE_PATHS.politicalClown, 86400),
  ]);
  return <div className={styles.page}>
    <header className={styles.header}><div><p className={styles.eyebrow}>Step 02 · campaign draft</p><h1 className={styles.title}>New campaign</h1><p className={styles.subtitle}>Prepare the approved Akiwumi Photo mailer, preview it for each recipient, then record a local test send.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns">Cancel</Link></header>
    <p className={styles.notice}>Step 1 of 3 · choose recipients first. Review and final preview happen on separate pages. No external email is sent from this local build.</p>
    <CampaignAudience contacts={contacts} categories={categories} mailerHtml={buildInteriorDesignerMailerHtml({ runningForPresident, politicalClown })} />
  </div>;
}
