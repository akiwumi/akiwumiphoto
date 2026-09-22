'use client';

import { useState } from 'react';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import { validateCollector, type FieldErrors } from '@/lib/collector-validation';
import { trackAnalyticsEvent } from '@/components/AnalyticsTracker';

interface CountryOption {
  code: string;
  name: string;
}

const EMPTY = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address_line1: '',
  address_line2: '',
  city: '',
  region: '',
  postcode: '',
  country_code: '',
  botcheck: '',
};

type FormState = typeof EMPTY;
type Status = 'idle' | 'sent' | 'already_registered';

// Notices raised by /auth/confirm when a verification link could not be used.
const VERIFY_NOTICES: Record<string, string> = {
  expired: 'That verification link has expired. Enter your details below and we will send you a fresh one.',
  device: 'That link has to be opened in the browser you registered from. Enter your details below for a new one, then open it on this device.',
  failed: 'We could not confirm that verification link. Enter your details below and we will send you a new one.',
  unavailable: 'Verification is temporarily unavailable. Please try again in a few minutes.',
};

export default function RegisterClient({
  countries,
  verifyNotice,
}: {
  countries: CountryOption[];
  verifyNotice?: string;
}) {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const [resent, setResent] = useState(false);

  const notice = verifyNotice ? VERIFY_NOTICES[verifyNotice] ?? VERIFY_NOTICES.failed : '';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear the field's error as soon as it is touched — leaving it there
    // while someone is fixing it just reads as noise.
    setErrors((prev) => (prev[name] ? { ...prev, [name]: '' } : prev));
  };

  // Shared by the initial submit and the "send it again" button.
  async function send(): Promise<boolean> {
    setFormError('');
    setBusy(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.ok) {
        setStatus(data.status === 'already_registered' ? 'already_registered' : 'sent');
        void trackAnalyticsEvent('registration_complete');
        return true;
      }

      // 422 comes back as per-field errors; anything else is form-level.
      if (data?.errors) {
        setErrors(data.errors);
        setFormError('Some details need checking before we can register your print.');
      } else {
        setFormError(data?.error ?? 'Registration failed. Please try again.');
      }
      return false;
    } catch {
      setFormError('Could not reach the server. Please check your connection and try again.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Bots fill the honeypot. Show them the same thing a person sees.
    if (form.botcheck) {
      setStatus('sent');
      return;
    }

    // The server validates again — this is only to save a round trip.
    const { errors: found } = validateCollector(form);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setFormError('Some details need checking before we can register your print.');
      setTimeout(() => document.getElementById(`register-${Object.keys(found)[0]}`)?.focus(), 0);
      return;
    }

    setErrors({});
    await send();
  };

  const handleResend = async () => {
    setResent(false);
    if (await send()) setResent(true);
  };

  if (status === 'sent' || status === 'already_registered') {
    return (
      <Reveal>
        <div className="register-panel register-confirmation">
          <span className="register-mark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </span>

          <h2>Check your inbox</h2>

          {status === 'already_registered' ? (
            <p>
              <strong>{form.email}</strong> is already registered. We have sent a fresh link to that
              address — open it to sign back in and tell us about your purchase.
            </p>
          ) : (
            <p>
              Your details are saved. We have sent a confirmation email to{' '}
              <strong>{form.email}</strong>. Open the link inside it to verify your account and
              complete your registration.
            </p>
          )}

          <p style={{ fontSize: 'var(--body-size)' }}>
            The link expires after an hour. If nothing arrives within a few minutes, check your spam
            folder before requesting another.
          </p>

          {resent && (
            <p style={{ color: 'var(--site-text)', fontSize: 'var(--body-size)' }} role="status">
              A new link is on its way.
            </p>
          )}
          {formError && (
            <p style={{ color: 'var(--site-text)', fontSize: 'var(--body-size)' }} role="alert">
              {formError}
            </p>
          )}

          <div className="flex items-center gap-5 flex-wrap">
            <button
              type="button"
              className="register-linkish"
              onClick={handleResend}
              disabled={busy}
            >
              {busy ? 'Sending…' : 'Send the link again'}
            </button>
            <button
              type="button"
              className="register-linkish"
              onClick={() => {
                setStatus('idle');
                setResent(false);
                setFormError('');
              }}
            >
              Edit my details
            </button>
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
        <label className="register-label" htmlFor={`register-${name}`}>
          {label}
          {optional && <span className="register-optional">optional</span>}
        </label>
        <input
          id={`register-${name}`}
          name={name}
          value={form[name]}
          onChange={handleChange}
          required={!optional}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? `register-${name}-error` : undefined}
          className="register-field field-focus"
          {...inputProps}
        />
        {error ? (
          <p className="register-error" id={`register-${name}-error`} role="alert">{error}</p>
        ) : hint ? (
          <p className="register-hint">{hint}</p>
        ) : null}
      </div>
    );
  };

  return (
    <Reveal>
      <form onSubmit={handleSubmit} noValidate className="register-panel">
        {notice && <div className="register-notice">{notice}</div>}
        {formError && (
          <div className="register-notice" role="alert">{formError}</div>
        )}
        {Object.keys(errors).length > 0 && (
          <div className="register-notice" role="alert" aria-live="polite">
            <strong>Please complete these fields:</strong>
            <ul>{Object.entries(errors).filter(([, message]) => message).map(([name, message]) => <li key={name}>{message}</li>)}</ul>
          </div>
        )}

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

        {/* Who you are */}
        <div className="register-section">
          <h2 className="register-section-title">
            <span className="register-step">1</span>
            Your details
          </h2>

          <div className="register-grid register-grid-pair">
            {field('first_name', 'First name', { autoComplete: 'given-name', maxLength: 60, placeholder: 'Ada' })}
            {field('last_name', 'Last name', { autoComplete: 'family-name', maxLength: 60, placeholder: 'Lovelace' })}
          </div>

          <div className="register-grid" style={{ marginTop: 14 }}>
            {field('email', 'Email address', {
              type: 'email',
              autoComplete: 'email',
              inputMode: 'email',
              maxLength: 254,
              placeholder: 'you@example.com',
              hint: 'We send your verification link here.',
            })}
            {field('phone', 'Phone number', {
              type: 'tel',
              autoComplete: 'tel',
              inputMode: 'tel',
              maxLength: 24,
              placeholder: '+44 7700 900123',
              hint: 'Include your country code.',
            })}
          </div>
        </div>

        {/* Where the print lives */}
        <div className="register-section">
          <h2 className="register-section-title">
            <span className="register-step">2</span>
            Delivery address
          </h2>

          <div className="register-grid">
            <div className="register-grid-full">
              {field('address_line1', 'Street address', {
                autoComplete: 'address-line1',
                maxLength: 120,
                placeholder: '12 Rivington Street',
              })}
            </div>
            <div className="register-grid-full">
              {field('address_line2', 'Apartment, suite, etc.', {
                autoComplete: 'address-line2',
                maxLength: 120,
                optional: true,
                placeholder: 'Flat 4',
              })}
            </div>

            {field('city', 'City', { autoComplete: 'address-level2', maxLength: 80, placeholder: 'London' })}
            {field('region', 'State / region', {
              autoComplete: 'address-level1',
              maxLength: 80,
              optional: true,
              placeholder: 'Greater London',
            })}

            {field('postcode', 'Postcode / ZIP', {
              autoComplete: 'postal-code',
              maxLength: 16,
              placeholder: 'EC2A 3LX',
            })}

            <div>
              <label className="register-label" htmlFor="register-country_code">Country</label>
              <div className="register-select-wrap">
                <select
                  id="register-country_code"
                  name="country_code"
                  value={form.country_code}
                  onChange={handleChange}
                  required
                  autoComplete="country"
                  aria-invalid={errors.country_code ? 'true' : undefined}
                  aria-describedby={errors.country_code ? 'register-country_code-error' : undefined}
                  className="register-field field-focus"
                >
                  <option value="">Select a country</option>
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
              </div>
              {errors.country_code && (
                <p className="register-error" id="register-country_code-error" role="alert">
                  {errors.country_code}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="register-section">
          <button type="submit" className="register-submit btn-lift" disabled={busy}>
            {busy ? 'Registering…' : 'Register my print'}
          </button>
          <p className="register-hint" style={{ marginTop: 12, maxWidth: '52ch' }}>
            Your details are stored only to record ownership of your print and to reach you about it.
            Read how we handle enquiries on the <Link href="/contact" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>contact page</Link>.
          </p>
        </div>
      </form>
    </Reveal>
  );
}
