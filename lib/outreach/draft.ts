export const OUTREACH_DRAFT_STORAGE_KEY = 'akiwumi-outreach-draft';

export interface OutreachDraft {
  selectedIds: string[];
  subject: string;
  html: string;
  text: string;
}
