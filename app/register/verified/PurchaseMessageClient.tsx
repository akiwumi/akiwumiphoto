'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { validatePurchaseMessage, type FieldErrors } from '@/lib/collector-validation';

const EMPTY = {
  artwork_title: '',
  purchase_reference: '',
  purchased_on: '',
  purchased_from: '',
  message: '',
  payment_method: 'unknown',
  gallery_image_id: '',
  botcheck: '',
};

type FormState = typeof EMPTY;

interface Receipt {
  reference: string;
  received_at: string;
}

export default function PurchaseMessageClient({ email }: { email: string }) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const submissionId = useRef(crypto.randomUUID());

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (form.botcheck) {
      setReceipt({ reference: '', received_at: new Date().toISOString() });
      return;
    }

    const { errors: found } = validatePurchaseMessage(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError('Some details need checking before we can send this.');
      return;
    }

    setErrors({});
    setFormError('');
    setBusy(true);

    try {
      const res = await fetch('/api/purchase-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, submission_id: submissionId.current }),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setReceipt({ reference: data.reference, received_at: data.received_at });
        return;
      }

      if (data?.errors) {
        setErrors(data.errors);
        setFormError('Some details need checking before we can send this.');
      } else {
        setFormError(data?.error ?? 'Your message could not be sent. Please try again.');
      }
    } catch {
      setFormError('Could not reach the server. Please check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  if (receipt) {
    const received = receipt.received_at
      ? new Date(receipt.received_at).toLocaleString('en-GB', {
          dateStyle: 'long',
          timeStyle: 'short',
        })
      : '';

    return (
      <Reveal>
        <div className="register-panel register-confirmation">
          <span className="register-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m4 12.5 5 5 11-11" />
            </svg>
          </span>

          <h2>Message received</h2>
          <p>
            Thank you — we have your message about <strong>{form.artwork_title}</strong> and a
            confirmation is on file against your account. We will be in touch at{' '}
            <strong>{email}</strong>.
          </p>

          {receipt.reference && (
            <dl className="register-summary">
              <dt>Reference</dt>
              <dd style={{ fontVariantNumeric: 'tabular-nums' }}>
                {receipt.reference.slice(0, 8).toUpperCase()}
              </dd>
              <dt>Received</dt>
              <dd>{received}</dd>
            </dl>
          )}

          <div className="flex items-center gap-5 flex-wrap" style={{ marginTop: 4 }}>
            <button
              type="button"
              className="register-linkish"
              onClick={() => {
                setForm(EMPTY);
                submissionId.current = crypto.randomUUID();
                setReceipt(null);
              }}
            >
              Tell us about another purchase
            </button>
            <Link href="/home" className="register-linkish" style={{ display: 'inline-block' }}>
              Back to the galleries
            </Link>
          </div>
        </div>
      </Reveal>
    );
  }

  const field = (
    name: keyof FormState,
    label: string,
    props: React.InputHTMLAttributes<HTMLInputElement> & { hint?: string; optional?: boolean } = {},
  ) => {
    const { hint, optional, ...inputProps } = props;
    const error = errors[name];
    return (
      <div>
        <label className="register-label" htmlFor={`purchase-${name}`}>
          {label}
          {optional && <span className="register-optional">optional</span>}
        </label>
        <input
          id={`purchase-${name}`}
          name={name}
          value={form[name]}
          onChange={handleChange}
          required={!optional}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `purchase-${name}-error` : undefined}
          className="register-field field-focus"
          {...inputProps}
        />
        {error ? (
          <p className="register-error" id={`purchase-${name}-error`} role="alert">{error}</p>
        ) : hint ? (
          <p className="register-hint">{hint}</p>
        ) : null}
      </div>
    );
  };

  // Nobody bought a print tomorrow.
  const today = new Date().toISOString().slice(0, 10);

  return (
    <Reveal>
      <form onSubmit={handleSubmit} noValidate className="register-panel">
        {formError && <div className="register-notice" role="alert">{formError}</div>}

        {/* Honeypot — off-screen and out of tab order, so only bots reach it. */}
        <input
          type="text"
          name="botcheck"
          value={form.botcheck}
          onChange={handleChange}
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        />

        <div className="register-section">
          <h2 className="register-section-title">Tell us about your purchase</h2>

          <div className="register-grid">
            <div className="register-grid-full">
              {field('artwork_title', 'Which photograph did you buy?', {
                maxLength: 160,
                placeholder: 'Title of the print',
              })}
            </div>

            {field('purchase_reference', 'Order or edition number', {
              maxLength: 80,
              optional: true,
              placeholder: 'e.g. 4 / 10',
            })}

            {field('purchased_on', 'Date of purchase', {
              type: 'date',
              max: today,
              optional: true,
            })}

            <div className="register-grid-full">
              {field('purchased_from', 'Where did you buy it?', {
                maxLength: 120,
                optional: true,
                placeholder: 'Gallery, exhibition, or direct from the studio',
              })}
            </div>

            <div>
              <label className="register-label" htmlFor="purchase-payment_method">How was it paid for?</label>
              <select id="purchase-payment_method" name="payment_method" value={form.payment_method} onChange={handleChange} className="register-field field-focus">
                <option value="unknown">Unknown / other</option><option value="card">Card</option><option value="bank_transfer">Bank transfer</option><option value="cash">Cash</option><option value="other">Other</option>
              </select>
            </div>

            <div className="register-grid-full">
              <label className="register-label" htmlFor="purchase-message">Your message</label>
              <textarea
                id="purchase-message"
                name="message"
                value={form.message}
                onChange={handleChange}
                required
                rows={6}
                maxLength={2000}
                placeholder="Tell us about your purchase — anything we should know about the print or its delivery."
                aria-invalid={errors.message ? 'true' : undefined}
                aria-describedby={errors.message ? 'purchase-message-error' : undefined}
                className="register-field field-focus"
              />
              {errors.message ? (
                <p className="register-error" id="purchase-message-error" role="alert">{errors.message}</p>
              ) : (
                <p className="register-hint">{form.message.length} / 2000 characters</p>
              )}
            </div>
          </div>
        </div>

        <div className="register-section">
          <button type="submit" className="register-submit btn-lift" disabled={busy}>
            {busy ? 'Sending…' : 'Send message'}
          </button>
        </div>
      </form>
    </Reveal>
  );
}
