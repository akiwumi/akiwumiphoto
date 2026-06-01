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
    <main
      className="full-screen flex flex-col overflow-y-auto"
      style={{
        background:
          'linear-gradient(rgba(0, 0, 0, 0.3), rgba(0, 0, 0, 0.46)), url("/images/prints-background.jpg") center / cover fixed',
      }}
    >
      <style>{`
        @media (max-width: 900px) {
          .prints-content {
            padding: 14px 5px 28px !important;
          }

          .prints-title {
            margin-bottom: 5px !important;
            padding: 20px !important;
          }

          .prints-grid {
            gap: 5px !important;
            margin-bottom: 5px !important;
          }

          .prints-panel {
            width: 100%;
            background: transparent !important;
            padding: 20px !important;
          }

          .prints-enquire {
            margin: 20px 20px 72px;
          }
        }
      `}</style>
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />

      <div className="prints-content flex-1 pb-12 page-enter" style={{ padding: '14px 60px 60px' }}>
        <Reveal>
          <h1
            className="prints-title inline-block font-bold uppercase mb-8"
            style={{
              color: '#FFFFFF',
              padding: '20px',
              fontSize: 'clamp(1.5rem, 4vw, 3rem)',
              letterSpacing: '0.08em',
            }}
          >
            LIMITED EDITION PRINTS
          </h1>
        </Reveal>

        {/* Print tier cards */}
        <div className="prints-grid grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {PRINT_TIERS.map((tier, index) => (
            <Reveal key={tier.size} delay={0.06 + index * 0.06}>
              <div
                className="prints-panel p-6 md:p-8 motion-card"
                style={{
                  height: '100%',
                }}
              >
                <h2 className="text-white font-bold text-2xl uppercase mb-1" style={{ letterSpacing: '0.08em' }}>
                  {tier.size}
                </h2>
                <p className="text-white text-sm mb-3" style={{ opacity: 0.76 }}>{tier.dimensions}</p>
                <p
                  className="text-white font-medium uppercase text-base mb-4"
                  style={{
                    letterSpacing: '0.08em',
                  }}
                >
                  {tier.edition}
                </p>
                <p className="text-white font-bold text-xl">POA</p>
              </div>
            </Reveal>
          ))}
        </div>

        {/* Info sections */}
        <div className="prints-grid grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Reveal delay={0.14}>
          <div className="prints-panel p-6 motion-card">
            <h3 className="text-white font-bold uppercase mb-3" style={{ letterSpacing: '0.08em' }}>
              Paper &amp; Quality
            </h3>
            <ul className="text-white text-sm space-y-1">
              <li>Fine art archival giclée</li>
              <li>Acid-free cotton rag paper</li>
              <li>310gsm minimum weight</li>
              <li>Pigment ink, 100-year archival rating</li>
              <li>Museum standard production</li>
            </ul>
          </div>
          </Reveal>

          <Reveal delay={0.22}>
          <div className="prints-panel p-6 motion-card">
            <h3 className="text-white font-bold uppercase mb-3" style={{ letterSpacing: '0.08em' }}>
              Certification
            </h3>
            <ul className="text-white text-sm space-y-1">
              <li>Each print hand-signed by the artist</li>
              <li>Numbered (e.g. 3/10) in pencil</li>
              <li>Embossed certificate of authenticity</li>
              <li>Once sold out — permanently retired</li>
              <li>Ultra Large: one print, one owner</li>
            </ul>
          </div>
          </Reveal>
        </div>

        <Reveal delay={0.28}>
          <Link
            href="/contact?subject=Print+Enquiry"
            className="prints-enquire inline-flex items-center justify-center font-medium uppercase text-white btn-lift"
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
        </Reveal>

      </div>
    </main>
  );
}
