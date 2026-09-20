import Link from 'next/link';
import styles from '../../../Outreach.module.css';
import { ADDRESS_BOOK } from '@/lib/outreach/address-book';
import FinalPreview from './FinalPreview';

export default function FinalCampaignPage() { return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Step 3 · final send review</p><h1 className={styles.title}>Final preview</h1><p className={styles.subtitle}>Review the exact personalized output, then confirm the local bulk send.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns/new/review">Back to review</Link></header><p className={styles.notice}>Local mock provider active · the confirmation records local sends only. No external email is sent from this local build.</p><FinalPreview initialContacts={ADDRESS_BOOK} /></div>; }
