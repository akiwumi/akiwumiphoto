import type { OutreachEmailProvider, NormalisedDeliveryEvent } from './types';
let counter = 0;
export const mockSentMessages: Array<Record<string, string>> = [];
export class MockOutreachProvider implements OutreachEmailProvider {
  async send(input: { to: string; from: string; replyTo: string; subject: string; html: string; text: string }): Promise<{ providerMessageId: string }> {
    const providerMessageId = `mock-${++counter}`; mockSentMessages.push({ ...input, providerMessageId }); return { providerMessageId };
  }
  async verifyWebhook(request: Request): Promise<unknown> { return request.json(); }
  normaliseWebhookEvent(payload: unknown): NormalisedDeliveryEvent[] {
    if (!payload || typeof payload !== 'object') return [];
    const value = payload as Record<string, unknown>;
    return [{ providerEventId: String(value.id ?? `mock-event-${Date.now()}`), providerMessageId: String(value.messageId ?? ''), status: (value.status ?? 'delivered') as NormalisedDeliveryEvent['status'], occurredAt: String(value.occurredAt ?? new Date().toISOString()), payload }];
  }
}

