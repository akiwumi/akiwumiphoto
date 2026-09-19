'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from '../../../Outreach.module.css';
import { CAMPAIGNS_STORAGE_KEY, DEFAULT_CAMPAIGN, type LocalCampaign } from '@/lib/outreach/campaigns';
import { ADDRESS_BOOK } from '@/lib/outreach/address-book';

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<LocalCampaign | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
        const campaigns = stored ? JSON.parse(stored) as LocalCampaign[] : [DEFAULT_CAMPAIGN];
        setCampaign(campaigns.find((entry) => entry.id === params.id) ?? null);
      } catch { setCampaign(null); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [params.id]);

  function update(field: keyof Pick<LocalCampaign, 'name' | 'subject' | 'preheader'>, value: string) {
    setCampaign((current) => current ? { ...current, [field]: value } : current);
    setSaved(false);
  }

  function save(event: React.FormEvent) {
    event.preventDefault();
    if (!campaign || !campaign.name.trim() || !campaign.subject.trim()) return;
    const stored = window.localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
    const campaigns = stored ? JSON.parse(stored) as LocalCampaign[] : [DEFAULT_CAMPAIGN];
    const next = campaigns.some((entry) => entry.id === campaign.id) ? campaigns.map((entry) => entry.id === campaign.id ? { ...campaign, updatedAt: 'Just now' } : entry) : [...campaigns, { ...campaign, audience: `${ADDRESS_BOOK.length} contacts · 0 approved`, updatedAt: 'Just now' }];
    window.localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(next));
    setCampaign(next.find((entry) => entry.id === campaign.id) ?? campaign);
    setSaved(true);
  }

  if (!campaign) return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Campaign not found</p><h1 className={styles.title}>Draft unavailable</h1><p className={styles.subtitle}>This local campaign may have been erased.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns">Back to campaigns</Link></header></div>;

  return <div className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>Step 02 · edit campaign</p><h1 className={styles.title}>Edit campaign</h1><p className={styles.subtitle}>Change the campaign details before opening its personalized mailer preview.</p></div><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns">Back to campaigns</Link></header><section className={styles.panel}><form className={styles.formGrid} onSubmit={save}><div className={styles.field}><label htmlFor="campaign-name">Internal name</label><input id="campaign-name" className={styles.input} value={campaign.name} onChange={(event) => update('name', event.target.value)} /></div><div className={styles.field}><label htmlFor="campaign-audience">Audience</label><input id="campaign-audience" className={styles.input} readOnly value={campaign.audience} /></div><div className={styles.field}><label htmlFor="campaign-subject">Subject line</label><input id="campaign-subject" className={styles.input} value={campaign.subject} onChange={(event) => update('subject', event.target.value)} /></div><div className={styles.field}><label htmlFor="campaign-preheader">Preheader</label><input id="campaign-preheader" className={styles.input} value={campaign.preheader} onChange={(event) => update('preheader', event.target.value)} /></div><div className={`${styles.field} ${styles.fieldFull}`}><div className={styles.actions}><button className={styles.button} type="submit">Save campaign changes →</button><Link className={styles.buttonSecondary} href="/admin/outreach/campaigns/new">Open mailer preview</Link></div>{saved && <p className={styles.success}>Campaign changes saved locally.</p>}</div></form></section></div>;
}
