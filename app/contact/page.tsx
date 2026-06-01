'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import NavBar from '@/components/NavBar';
import Reveal from '@/components/Reveal';

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

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    subject: defaultSubject,
    message: '',
  });
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${form.firstName} ${form.lastName}`.trim(),
          email: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ firstName: '', lastName: '', email: '', subject: 'General Enquiry', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
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
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          maxLength={120}
          placeholder="Enter your message"
          className="contact-message w-full px-4 py-3 bg-white text-black font-sans text-base resize-vertical field-focus"
          style={{ border: '1px solid #D6D6D6', outline: 'none', minHeight: 120 }}
        />
      </div>

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
        <p className="text-center text-sm text-black">Message sent. We&apos;ll be in touch.</p>
      )}
      {status === 'error' && (
        <p className="text-center text-sm" style={{ color: '#E8001C' }}>
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}

export default function ContactPage() {
  return (
    <main className="contact-page full-screen bg-white flex flex-col overflow-hidden">
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />

      <div className="contact-content flex-1 page-enter" style={{ padding: '14px 60px 60px' }}>
        <Reveal>
          <h1
            className="contact-heading text-white font-bold uppercase mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
          >
            CONTACT
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
