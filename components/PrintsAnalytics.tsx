'use client';

import { useEffect } from 'react';
import { trackAnalyticsEvent } from './AnalyticsTracker';

/** Records the print catalogue view without exposing pricing or buyer data. */
export default function PrintsAnalytics() {
  useEffect(() => {
    void trackAnalyticsEvent('product_view', { category: 'prints' });
  }, []);
  return null;
}
