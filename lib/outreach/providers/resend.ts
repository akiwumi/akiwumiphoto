import type { OutreachEmailProvider, NormalisedDeliveryEvent } from './types';
import type { DeliveryStatus } from '@/types/outreach';

export function createResendProvider(apiKey = process.env.OUTREACH_PROVIDER_API_KEY || process.env.RESEND_API_KEY): OutreachEmailProvider {
  if (!apiKey) throw new Error('Set OUTREACH_PROVIDER_API_KEY or RESEND_API_KEY before sending.');
  return {
    async send(input) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: input.from,
          to: [input.to],
          reply_to: input.replyTo,
          subject: input.subject,
          html: input.html,
          text: input.text,
          headers: input.headers,
        }),
      });
      const body = await response.json().catch(() => ({})) as { id?: string; message?: string };
      if (!response.ok || !body.id) throw new Error(body.message || `Resend returned HTTP ${response.status}.`);
      return { providerMessageId: body.id };
    },
    async verifyWebhook(request) {
      const secret = process.env.OUTREACH_WEBHOOK_SECRET;
      const signature = request.headers.get('svix-signature');
      if (!secret || !signature || !signature.includes(secret)) throw new Error('Invalid Resend webhook signature.');
      return request.json();
    },
    normaliseWebhookEvent(payload) {
      const value = payload as { type?: string; id?: string; data?: { email_id?: string; created_at?: string } };
      const status = ({
        'email.sent': 'submitted', 'email.delivered': 'delivered', 'email.opened': 'opened',
        'email.clicked': 'clicked', 'email.bounced': 'bounced', 'email.failed': 'failed',
      } as Record<string, DeliveryStatus>)[value.type || ''];
      if (!status || !value.id || !value.data?.email_id) return [];
      return [{ providerEventId: value.id, providerMessageId: value.data.email_id, status, occurredAt: value.data.created_at || new Date().toISOString(), payload }];
    },
  };
}
