import type { OutreachEmailProvider } from './types';
import { MockOutreachProvider } from './mock';
import { createResendProvider } from './resend';
export function getOutreachProvider(): OutreachEmailProvider {
  const provider = process.env.OUTREACH_EMAIL_PROVIDER || process.env.OUTREACH_PROVIDER;
  return provider === 'resend' ? createResendProvider() : new MockOutreachProvider();
}
