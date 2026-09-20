import crypto from 'node:crypto';
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
      const id = request.headers.get('svix-id');
      const timestamp = request.headers.get('svix-timestamp');
      const signature = request.headers.get('svix-signature');
      if (!secret || !id || !timestamp || !signature) throw new Error('Invalid Resend webhook signature.');
      const timestampSeconds = Number(timestamp);
      if (!Number.isFinite(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > 300) throw new Error('Expired Resend webhook signature.');
      const body = await request.text();
      const encodedSecret = secret.replace(/^whsec_/, '');
      const secretBytes = Buffer.from(encodedSecret, 'base64');
      const signedContent = `${id}.${timestamp}.${body}`;
      const expected = crypto.createHmac('sha256', secretBytes).update(signedContent).digest('base64');
      const valid = signature.split(' ').some((value) => {
        const received = value.replace(/^v1,/, '');
        const expectedBytes = Buffer.from(expected);
        const receivedBytes = Buffer.from(received);
        return expectedBytes.length === receivedBytes.length && crypto.timingSafeEqual(expectedBytes, receivedBytes);
      });
      if (!valid) throw new Error('Invalid Resend webhook signature.');
      return JSON.parse(body);
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
