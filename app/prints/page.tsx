import type { Metadata } from 'next';
import { connection } from 'next/server';
import NavBar from '@/components/NavBar';
import Link from 'next/link';
import Reveal from '@/components/Reveal';
import CurrencySelect from '@/components/CurrencySelect';
import PriceTag from '@/components/PriceTag';
import { getPrintSizes, getPrintsPageContent, listItems } from '@/lib/print-shop';
import { SHIPPING_POLICY, DISPATCH_NOTICE } from '@/lib/shipping';

export const metadata: Metadata = {
  title: 'Limited Edition Prints | Eugene Akiwumi',
  description: 'Hand-signed, numbered limited edition fine art prints by Eugene Akiwumi.',
};

export default async function PrintsPage() {
  // Rendered per request: sizes, prices and the text below are edited in the
  // admin and must show without a redeploy.
  await connection();
  const [sizes, content] = await Promise.all([getPrintSizes(), getPrintsPageContent()]);

  const sections = [
    { heading: content.paper_heading || 'Paper & Quality', items: listItems(content.paper_items) },
    { heading: content.certification_heading || 'Certification', items: listItems(content.certification_items) },
  ].filter((section) => section.items.length > 0);

  return (
    <main
      className="full-screen flex flex-col overflow-y-auto"
    >
      <NavBar />

      <div className="prints-content flex-1 pb-12 page-enter" style={{ padding: '14px 60px 60px' }}>
        <Reveal>
          <div className="prints-heading-row">
            <h1
              className="prints-title inline-block font-bold uppercase mb-8"
              style={{
                color: '#FFFFFF',
                padding: '20px',
                fontSize: 'clamp(1.5rem, 4vw, 3rem)',
                letterSpacing: '0.08em',
              }}
            >
              Limited edition prints
            </h1>
            <CurrencySelect />
          </div>
          <p className="prints-intro">
            Every photograph in the gallery is available as a print in the sizes below. Each size is
            its own numbered edition. Open any photograph and choose <strong>Add to basket</strong>.
          </p>
        </Reveal>

        {/* Print tier cards */}
        <div className="prints-grid grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {sizes.map((size, index) => (
            <Reveal key={size.id} delay={0.06 + index * 0.06}>
              <div
                className="prints-panel p-6 md:p-8 motion-card"
                style={{
                  height: '100%',
                }}
              >
                <h2 className="text-white font-bold text-2xl uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
                  {size.name}
                </h2>
                {size.dimensions && (
                  <p className="text-white text-base mb-3" style={{ opacity: 0.76 }}>{size.dimensions}</p>
                )}
                <p
                  className="text-white font-medium uppercase text-base mb-4"
                  style={{
                    letterSpacing: '0.08em',
                  }}
                >
                  {size.edition_size === 1 ? 'Unique — 1 print only' : `Edition of ${size.edition_size}`}
                </p>
                <p className="text-white font-bold text-xl"><PriceTag usd={size.price_usd} /></p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Info sections */}
        <section className="prints-panel p-6 mb-8 text-white" aria-labelledby="shipping-heading">
          <h2 id="shipping-heading" className="font-bold uppercase mb-3">Post &amp; packaging</h2>
          <p>{SHIPPING_POLICY}</p>
          <p className="mt-2">{DISPATCH_NOTICE}</p>
        </section>
        {sections.length > 0 && (
          <div className="prints-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            {sections.map((section, index) => (
              <Reveal key={section.heading} delay={0.14 + index * 0.08}>
                <div className="prints-panel p-6 motion-card">
                  <h3 className="text-white font-bold uppercase mb-3" style={{ letterSpacing: '0.08em' }}>
                    {section.heading}
                  </h3>
                  <ul className="text-white text-base space-y-1">
                    {section.items.map((item) => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              </Reveal>
            ))}
          </div>
        )}

        <Reveal delay={0.28}>
          <div className="prints-enquire flex flex-wrap items-center gap-4">
            <Link
              href="/home"
              className="inline-flex items-center justify-center font-medium uppercase text-white btn-lift"
              style={{
                background: 'rgba(232, 0, 28, 0.78)',
                border: '1px solid rgba(255, 255, 255, 0.62)',
                padding: '14px 24px',
                letterSpacing: '0.12em',
                fontSize: '0.875rem',
              }}
            >
              Choose a Photograph
            </Link>

            <Link
              href="/contact?subject=Print+Enquiry"
              className="inline-flex items-center justify-center font-medium uppercase text-white btn-lift"
              style={{
                background: 'rgba(232, 0, 28, 0.78)',
                border: '1px solid rgba(255, 255, 255, 0.62)',
                padding: '14px 24px',
                letterSpacing: '0.12em',
                fontSize: '0.875rem',
              }}
            >
              Enquire About Prints
            </Link>

            {/* Where buyers land after a purchase to record ownership. */}
            <Link
              href="/register"
              className="inline-flex items-center justify-center font-medium uppercase text-white btn-lift"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.62)',
                padding: '14px 24px',
                letterSpacing: '0.12em',
                fontSize: '0.875rem',
              }}
            >
              Already Bought? Register Your Print
            </Link>
          </div>
        </Reveal>

      </div>
    </main>
  );
}
