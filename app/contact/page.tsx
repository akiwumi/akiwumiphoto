'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Reveal from '@/components/Reveal';

/**
 * Web3Forms only accepts submissions from the browser on the free plan —
 * server-to-server posting is a Pro feature — so the form talks to them
 * directly. The access key is public by their design; which inbox enquiries
 * land in is bound to the key itself, chosen when the key is created.
 */
const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const ACCESS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY;

const SUBJECTS = [
  'General Enquiry',
  'Print Enquiry',
  'Commission',
  'Collaboration',
  'Press & Media',
  'Other',
];

function ContactForm() {
  const searchParams = useSearchParams();
  const defaultSubject = searchParams.get('subject') || 'General Enquiry';
  // Set by "Enquire about this print" in the gallery lightbox, so the
  // enquiry arrives already naming the photograph.
  const print = searchParams.get('print')?.slice(0, 300);
  const defaultMessage = print ? `I'd like to enquire about a print of this photograph:\n${print}\n\n` : '';

  const EMPTY = {
    firstName: '',
    lastName: '',
    email: '',
    subject: defaultSubject,
    message: defaultMessage,
    botcheck: '', // honeypot — see the hidden field below
  };

  const [form, setForm] = useState(EMPTY);
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  // The form is only cleared once the send is confirmed, so a failure never
  // costs the visitor what they typed.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Anything in the honeypot means a bot. Drop it without a word, rather
    // than reporting back what gave it away.
    if (form.botcheck) {
      setStatus('success');
      setForm({ ...EMPTY, message: '' });
      return;
    }

    if (!ACCESS_KEY) {
      console.error('[contact] NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY is not set');
      setError('The form is not configured yet. Please try again later.');
      setStatus('error');
      return;
    }

    setStatus('sending');
    setError('');

    const name = `${form.firstName} ${form.lastName}`.trim();

    try {
      const res = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: ACCESS_KEY,
          from_name: 'Akiwumi Photo',
          subject: `[akiwumiphoto.com] ${form.subject} — ${name}`,
          replyto: form.email,
          botcheck: false,
          // Reproduced verbatim in the notification email.
          name,
          email: form.email,
          enquiry: form.subject,
          message: form.message,
        }),
      });

      // Web3Forms reports rejections in the body, so an ok status is not enough.
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setStatus('success');
        setForm({ ...EMPTY, message: '' });
        return;
      }

      console.error('[contact] Web3Forms rejected the send:', res.status, data?.message);
      setError('The message could not be sent. Please try again.');
      setStatus('error');
    } catch {
      setError('Could not reach the mail service. Please check your connection.');
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form flex flex-col gap-4 w-full max-w-lg">
      <h2 className="contact-form-title text-black font-bold">Send us a message</h2>

      {/* Name */}
      <div>
        <label className="block text-black text-xs font-medium mb-1.5">
          Name*
        </label>
        <div className="contact-name-row grid grid-cols-2 gap-3">
          <input
            type="text"
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            required
            placeholder="First Name"
            className="contact-field w-full h-12 px-4 bg-white text-black font-sans text-base field-focus"
            style={{ border: '1px solid #D6D6D6', outline: 'none' }}
          />
          <input
            type="text"
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            required
            placeholder="Last Name"
            className="contact-field w-full h-12 px-4 bg-white text-black font-sans text-base field-focus"
            style={{ border: '1px solid #D6D6D6', outline: 'none' }}
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-black text-xs font-medium mb-1.5">
          Mail*
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          placeholder="Enter your email"
          className="contact-field w-full h-12 px-4 bg-white text-black font-sans text-base field-focus"
          style={{ border: '1px solid #D6D6D6', outline: 'none' }}
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-black text-xs font-medium mb-1.5">
          How can we help?
        </label>
        <select
          name="subject"
          value={form.subject}
          onChange={handleChange}
          className="contact-field w-full h-12 px-4 bg-white text-black font-sans text-base appearance-none cursor-pointer field-focus"
          style={{ border: '1px solid #D6D6D6', outline: 'none' }}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block text-black text-xs font-medium mb-1.5">
          Comments
        </label>
        {/* maxLength is capped so the encoded mailto: URL stays under the
            ~2000-character limit some OS mail handlers impose. */}
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          maxLength={1000}
          placeholder="Enter your message"
          className="contact-message w-full px-4 py-3 bg-white text-black font-sans text-base resize-vertical field-focus"
          style={{ border: '1px solid #D6D6D6', outline: 'none', minHeight: 120 }}
        />
      </div>

      {/* Honeypot: off-screen and skipped by tab order, so only bots fill it.
          Named for the field Web3Forms itself screens on. */}
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

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="contact-submit w-full h-14 text-white font-medium uppercase text-sm transition-colors btn-lift"
        style={{
          background: status === 'sending' ? 'rgba(153, 153, 153, 0.72)' : 'rgba(232, 0, 28, 0.68)',
          border: '1px solid rgba(255, 255, 255, 0.62)',
          backdropFilter: 'blur(10px)',
          letterSpacing: '0.12em',
          cursor: status === 'sending' ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.background = 'rgba(192, 0, 24, 0.82)'; }}
        onMouseLeave={(e) => { if (status !== 'sending') e.currentTarget.style.background = 'rgba(232, 0, 28, 0.68)'; }}
      >
        {status === 'sending' ? 'Sending…' : 'Submit'}
      </button>

      {status === 'success' && (
        <p className="contact-status text-center text-sm" role="status">
          Thank you — your message has been sent. We&apos;ll be in touch.
        </p>
      )}
      {status === 'error' && (
        <p className="contact-status contact-status-error text-center text-sm" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export default function ContactPage() {
  return (
    <main className="contact-page full-screen bg-white flex flex-col overflow-hidden">
      <NavBar />

      <div className="contact-content flex-1 page-enter" style={{ padding: '14px 60px 60px' }}>
        <Reveal>
          <h1
            className="contact-heading text-white font-bold uppercase mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
          >
            Contact
          </h1>
          <div className="contact-rule h-0.5 bg-white mb-8" />
        </Reveal>

        <div className="contact-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 32 }}>
          {/* Left column — form */}
          <div>
            <Reveal delay={0.1}>
              <Suspense fallback={<div className="text-black text-sm">Loading…</div>}>
                <ContactForm />
              </Suspense>
            </Reveal>

            {/* Social icons */}
            <Reveal delay={0.22} className="contact-social-row flex items-center gap-6 mt-8">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="contact-social text-white hover:text-red transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </a>
            </Reveal>
          </div>

          {/* Right column — background image breathing room */}
          <div />
        </div>
      </div>
    </main>
  );
}
