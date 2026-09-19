export const CONTACT_STATUSES = ['imported', 'needs_review', 'approved', 'replied', 'follow_up', 'converted', 'not_interested', 'suppressed'] as const;
export type ContactStatus = typeof CONTACT_STATUSES[number];
export const CAMPAIGN_STATUSES = ['draft', 'testing', 'queued', 'sending', 'paused', 'completed', 'cancelled'] as const;
export type CampaignStatus = typeof CAMPAIGN_STATUSES[number];
export const DELIVERY_STATUSES = ['queued', 'submitted', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed'] as const;
export type DeliveryStatus = typeof DELIVERY_STATUSES[number];
export const MERGE_FIELDS = ['first_name', 'company_name', 'city', 'website', 'unsubscribe_url'] as const;
export type MergeField = typeof MERGE_FIELDS[number];

export interface OutreachContact {
  id: string; email: string; first_name: string | null; last_name: string | null;
  company_name: string | null; city: string | null; country: string | null;
  website: string | null; source: string | null; source_url: string | null; notes: string | null;
  approved_for_outreach: boolean; contact_status: ContactStatus; suppressed_at: string | null;
  suppression_reason: string | null; replied_at: string | null; follow_up_at: string | null;
  created_at: string; updated_at: string;
}
export interface OutreachCampaign {
  id: string; name: string; description: string | null; subject: string; preheader: string | null;
  html_template: string; text_template: string; from_name: string; from_email: string;
  reply_to_email: string; status: CampaignStatus; scheduled_at: string | null;
  started_at: string | null; completed_at: string | null; created_at: string; updated_at: string;
}
export interface OutreachDelivery { id: string; campaign_id: string; contact_id: string; provider_message_id: string | null; status: DeliveryStatus; rendered_subject: string | null; sent_at: string | null; delivered_at: string | null; opened_at: string | null; clicked_at: string | null; bounced_at: string | null; error_message: string | null; created_at: string; updated_at: string; }

