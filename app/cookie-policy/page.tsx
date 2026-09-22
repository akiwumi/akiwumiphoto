import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

export const metadata: Metadata = {
  title: 'Cookie Policy | Eugene Akiwumi',
  description: 'Information about essential and analytics cookies used by Akiwumi Photo.',
  alternates: { canonical: '/cookie-policy' },
};

export default function CookiePolicyPage() {
  return (
    <main className="full-screen bg-black flex flex-col">
      <NavBar />
      <div className="site-page-heading"><h1>Cookie Policy</h1><p>How Akiwumi Photo uses essential cookies and optional analytics.</p></div>
      <article className="page-blocks">
        <section className="pb-text"><h2>Essential cookies</h2><p>Essential cookies are always on. They support security, signed-in accounts, the basket and checkout process, and site preferences such as currency. These are needed for the website to function.</p></section>
        <section className="pb-text"><h2>Analytics</h2><p>With your permission, Akiwumi Photo sends first-party analytics to a Supabase database to understand aggregate visits and improve the site. Analytics remains off until you explicitly accept it.</p><p>When enabled, the site creates an anonymous identifier in your browser&apos;s local storage and sends its one-way hash with a session identifier. We do not use your name, email address, or message contents for analytics. We record limited event categories: page views; gallery and image interactions; contact submissions; print and basket activity; checkout and payment outcomes; and registrations. Referrer origin, page path, device class, and allowlisted product or gallery metadata may also be recorded.</p></section>
        <section className="pb-text"><h2>Your choices</h2><p>We remember your choice for six months. You can change or withdraw it at any time using Cookie settings in the footer. If you choose Essential only, optional analytics stops sending new events. Withdrawing consent does not delete analytics already recorded; contact us if you have a question about an existing record.</p></section>
        <section className="pb-text"><h2>Questions</h2><p>If you have questions about cookies or privacy, please <Link href="/contact">contact us</Link>.</p></section>
      </article>
    </main>
  );
}
