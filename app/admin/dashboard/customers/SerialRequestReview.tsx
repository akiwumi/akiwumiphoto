'use client';

import { useState } from 'react';

export default function SerialRequestReview({ requestId, status }: { requestId: string; status: string }) {
  const [current, setCurrent] = useState(status);
  const [busy, setBusy] = useState(false);
  const decide = async (decision: 'approved' | 'denied') => {
    setBusy(true);
    const response = await fetch('/api/admin/serial-number-requests', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ requestId, decision }) });
    if (response.ok) setCurrent(decision);
    setBusy(false);
  };
  if (current !== 'pending') return <span>{current}</span>;
  return <span style={{ display: 'inline-flex', gap: 8 }}><button type="button" disabled={busy} onClick={() => decide('approved')}>Approve</button><button type="button" disabled={busy} onClick={() => decide('denied')}>Deny</button></span>;
}
