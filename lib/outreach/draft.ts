export const OUTREACH_DRAFT_STORAGE_KEY = 'akiwumi-outreach-draft';

export interface OutreachDraft {
  campaignId?: string;
  selectedIds: string[];
  subject: string;
  html: string;
  text: string;
}
