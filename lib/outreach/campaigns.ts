export interface LocalCampaign {
  id: string;
  name: string;
  subject: string;
  preheader: string;
  status: 'draft';
  audience: string;
  updatedAt: string;
}

export const DEFAULT_CAMPAIGN: LocalCampaign = {
  id: 'scandinavia-first-introduction',
  name: 'Scandinavia · first introduction',
  subject: 'Photography for considered interiors',
  preheader: 'A quiet introduction to Akiwumi Photo.',
  status: 'draft',
  audience: '16 contacts · 0 approved',
  updatedAt: 'Today',
};

export const CAMPAIGNS_STORAGE_KEY = 'akiwumi-outreach-campaigns';
