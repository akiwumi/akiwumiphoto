'use client';

import { useState } from 'react';

export default function SerialNumberRequestButton({ certificateId, status }: { certificateId: string; status: 'pending' | 'approved' | 'denied' | null }) {
  const [state, setState] = useState(status);
  const [message, setMessage] = useState('');
  const request = async () => {
    setMessage('');
    const response = await fetch('/api/account/serial-number-request', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ certificateId }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { setMessage(data.error || 'Request failed.'); return; }
    setState('pending'); setMessage(data.message || 'Request sent.');
  };
  if (state === 'approved') return <p style={{ color: 'rgba(255,255,255,.8)', fontSize: 14 }}>Registered number approved. Refresh to view it.</p>;
  if (state === 'pending') return <p style={{ color: 'rgba(255,255,255,.68)', fontSize: 14 }}>Registered number request pending review.</p>;
  return <div><button type="button" className="register-submit btn-lift" onClick={request}>Request registered number</button>{message && <p role="status" style={{ color: 'rgba(255,255,255,.68)', fontSize: 14 }}>{message}</p>}</div>;
}
