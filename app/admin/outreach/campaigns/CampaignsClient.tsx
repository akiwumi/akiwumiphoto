'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import styles from '../Outreach.module.css';
import { CAMPAIGNS_STORAGE_KEY, DEFAULT_CAMPAIGN, type LocalCampaign } from '@/lib/outreach/campaigns';

export default function CampaignsClient() {
  const [campaigns, setCampaigns] = useState<LocalCampaign[]>([DEFAULT_CAMPAIGN]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const stored = window.localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
        if (stored) setCampaigns(JSON.parse(stored) as LocalCampaign[]);
      } catch { /* use the default campaign */ }
      setLoaded(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  function eraseCampaign(id: string) {
    const campaign = campaigns.find((entry) => entry.id === id);
    if (!campaign || !window.confirm(`Erase “${campaign.name}”? This removes the local campaign draft.`)) return;
    const next = campaigns.filter((entry) => entry.id !== id);
    setCampaigns(next);
    window.localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(next));
  }

  return <section className={styles.panel}>
    <div className={styles.panelHead}><div><h2 className={styles.panelTitle}>Campaigns</h2><p className={styles.panelMeta}>{loaded ? `${campaigns.length} local draft${campaigns.length === 1 ? '' : 's'}` : 'Loading local drafts…'}</p></div></div>
    {campaigns.length === 0 ? <div className={styles.emptyState}>No campaigns remain. Start a new campaign to create a draft.</div> : <div className={styles.tableScroll}><table className={styles.table}><thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th>Updated</th><th><span className={styles.srOnly}>Actions</span></th></tr></thead><tbody>{campaigns.map((campaign) => <tr key={campaign.id}><td><strong>{campaign.name}</strong><br/><span>{campaign.subject}</span></td><td>{campaign.audience}</td><td><span className={`${styles.chip} ${styles.chipWarn}`}>{campaign.status}</span></td><td>{campaign.updatedAt}</td><td><div className={styles.rowActions}><Link className={styles.smallButton} href={`/admin/outreach/campaigns/${campaign.id}/edit`}>Edit</Link><button type="button" className={styles.smallButtonDanger} onClick={() => eraseCampaign(campaign.id)}>Erase</button></div></td></tr>)}</tbody></table></div>}
  </section>;
}
