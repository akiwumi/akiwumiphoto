import type { OutreachEmailProvider } from './types';
import { MockOutreachProvider } from './mock';
export function getOutreachProvider(): OutreachEmailProvider { return new MockOutreachProvider(); }

