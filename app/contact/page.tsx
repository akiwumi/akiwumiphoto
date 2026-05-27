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
    name: '',
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
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setStatus('success');
        setForm({ name: '', email: '', subject: 'General Enquiry', message: '' });
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-lg">
      {/* Name */}
      <div>
        <label className="block text-black text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
          Name
        </label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full h-12 px-4 bg-white text-black font-sans text-base field-focus"
          style={{ border: '2px solid #000000', outline: 'none' }}
        />
      </div>

      {/* Email */}
      <div>
        <label className="block text-black text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
          Email
        </label>
        <input
          type="email"
          name="email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full h-12 px-4 bg-white text-black font-sans text-base field-focus"
          style={{ border: '2px solid #000000', outline: 'none' }}
        />
      </div>

      {/* Subject */}
      <div>
        <label className="block text-black text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
          Subject
        </label>
        <select
          name="subject"
          value={form.subject}
          onChange={handleChange}
          className="w-full h-12 px-4 bg-white text-black font-sans text-base appearance-none cursor-pointer field-focus"
          style={{ border: '2px solid #000000', outline: 'none' }}
        >
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Message */}
      <div>
        <label className="block text-black text-xs font-medium uppercase mb-1.5" style={{ letterSpacing: '0.1em' }}>
          Message
        </label>
        <textarea
          name="message"
          value={form.message}
          onChange={handleChange}
          required
          rows={5}
          className="w-full px-4 py-3 bg-white text-black font-sans text-base resize-vertical field-focus"
          style={{ border: '2px solid #000000', outline: 'none', minHeight: 120 }}
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={status === 'sending'}
        className="w-full h-14 text-white font-medium uppercase text-sm transition-colors btn-lift"
        style={{
          background: status === 'sending' ? '#999' : '#E8001C',
          letterSpacing: '0.12em',
          cursor: status === 'sending' ? 'not-allowed' : 'pointer',
        }}
        onMouseEnter={(e) => { if (status !== 'sending') e.currentTarget.style.background = '#C00018'; }}
        onMouseLeave={(e) => { if (status !== 'sending') e.currentTarget.style.background = '#E8001C'; }}
      >
        {status === 'sending' ? 'Sending…' : 'Send Message'}
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
    <main className="full-screen bg-white flex flex-col overflow-y-auto">
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />

      <div className="flex-1 page-enter" style={{ padding: '14px 60px 60px' }}>
        <Reveal>
          <h1
            className="text-black font-bold uppercase mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
          >
            CONTACT
          </h1>
          <div className="h-0.5 bg-black mb-8" />
        </Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {/* Left column — empty */}
          <div />

          {/* Middle column — form */}
          <div>
            <Reveal delay={0.1}>
              <Suspense fallback={<div className="text-black text-sm">Loading…</div>}>
                <ContactForm />
              </Suspense>
            </Reveal>

            {/* Social icons */}
            <Reveal delay={0.22} className="flex items-center gap-6 mt-8">
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                className="text-black hover:text-red transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                </svg>
              </a>
            </Reveal>
          </div>

          {/* Right column — empty */}
          <div />
        </div>
      </div>
    </main>
  );
}
