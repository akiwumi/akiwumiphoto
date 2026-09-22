import type { OutreachEmailProvider } from './types';
import { MockOutreachProvider } from './mock';
import { createResendProvider } from './resend';
export function getOutreachProvider(): OutreachEmailProvider {
  const provider = process.env.OUTREACH_EMAIL_PROVIDER || process.env.OUTREACH_PROVIDER;
  const apiKey = process.env.OUTREACH_PROVIDER_API_KEY || process.env.RESEND_API_KEY;
  return provider === 'resend' || (!provider && apiKey) ? createResendProvider(apiKey) : new MockOutreachProvider();
}
