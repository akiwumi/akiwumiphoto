import NavBar from '@/components/NavBar';
import Link from 'next/link';
import Reveal from '@/components/Reveal';

const PRINT_TIERS = [
  {
    size: 'Small',
    dimensions: '12 × 16"',
    edition: 'Edition of 10',
    priceKey: 'small_price',
    highlight: false,
  },
  {
    size: 'Medium',
    dimensions: '20 × 24"',
    edition: 'Edition of 10',
    priceKey: 'medium_price',
    highlight: false,
  },
  {
    size: 'Large',
    dimensions: '30 × 40"',
    edition: 'Edition of 10',
    priceKey: 'large_price',
    highlight: false,
  },
  {
    size: 'Ultra',
    dimensions: '48 × 60"+',
    edition: 'Unique — 1 Print Only',
    priceKey: 'ultra_price',
    highlight: true,
  },
];

export default function PrintsPage() {
  return (
    <main className="full-screen bg-white flex flex-col overflow-y-auto">
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />

      <div className="flex-1 pb-24 md:pb-12 page-enter" style={{ padding: '14px 60px 60px' }}>
        <Reveal>
          <h1
            className="text-black font-bold uppercase mb-4"
            style={{ fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
          >
            LIMITED EDITION PRINTS
          </h1>
          <div className="h-0.5 bg-black mb-8 w-full" />
        </Reveal>

        {/* Print tier cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {PRINT_TIERS.map((tier, index) => (
            <Reveal key={tier.size} delay={0.06 + index * 0.06}>
              <div
                className="p-6 md:p-8 motion-card"
                style={{
                  border: `2px solid ${tier.highlight ? '#E8001C' : '#000000'}`,
                  background: '#FFFFFF',
                  height: '100%',
                }}
              >
                <h2 className="text-black font-bold text-2xl uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
                  {tier.size}
                </h2>
                <p className="text-grey-mid text-sm mb-3">{tier.dimensions}</p>
                <p
                  className="font-medium uppercase text-base mb-4"
                  style={{
                    color: tier.highlight ? '#E8001C' : '#000000',
                    letterSpacing: '0.08em',
                  }}
                >
                  {tier.edition}
                </p>
                <p className="text-black font-bold text-xl">POA</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Info sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Reveal delay={0.14}>
          <div className="border-2 border-black p-6 motion-card">
            <h3 className="text-black font-bold uppercase mb-3" style={{ letterSpacing: '0.08em' }}>
              Paper &amp; Quality
            </h3>
            <ul className="text-black text-sm space-y-1">
              <li>Fine art archival giclée</li>
              <li>Acid-free cotton rag paper</li>
              <li>310gsm minimum weight</li>
              <li>Pigment ink, 100-year archival rating</li>
              <li>Museum standard production</li>
            </ul>
          </div>
          </Reveal>

          <Reveal delay={0.22}>
          <div className="border-2 border-black p-6 motion-card">
            <h3 className="text-black font-bold uppercase mb-3" style={{ letterSpacing: '0.08em' }}>
              Certification
            </h3>
            <ul className="text-black text-sm space-y-1">
              <li>Each print hand-signed by the artist</li>
              <li>Numbered (e.g. 3/10) in pencil</li>
              <li>Embossed certificate of authenticity</li>
              <li>Once sold out — permanently retired</li>
              <li>Ultra Large: one print, one owner</li>
            </ul>
          </div>
          </Reveal>
        </div>

        {/* CTA */}
        <Reveal delay={0.28}>
          <Link
            href="/contact?subject=Print+Enquiry"
            className="inline-flex items-center justify-center gap-2 font-medium uppercase text-white btn-lift"
            style={{
              background: '#E8001C',
              padding: '14px 32px',
              letterSpacing: '0.12em',
              fontSize: '0.875rem',
            }}
          >
            Enquire About a Print →
          </Link>
        </Reveal>
      </div>

      {/* Mobile sticky CTA */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-black"
        style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
      >
        <Link
          href="/contact?subject=Print+Enquiry"
          className="flex items-center justify-center w-full h-14 font-medium uppercase text-white text-sm btn-lift"
          style={{ background: '#E8001C', letterSpacing: '0.12em' }}
        >
          Enquire About a Print
        </Link>
      </div>
    </main>
  );
}
