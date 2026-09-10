import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import Reveal from '@/components/Reveal';
import { countryOptions } from '@/lib/countries';
import RegisterClient from './RegisterClient';

export const metadata: Metadata = {
  title: 'Register Your Print — AKIWUMI PHOTO',
  description: 'Register your details after purchasing a photograph and record ownership of your print.',
};

const STEPS = [
  {
    title: 'Register',
    body: 'Give us your name, email and the address your print lives at. Every field is checked before it is saved.',
  },
  {
    title: 'Verify',
    body: 'We email you a confirmation link. Opening it proves the address is yours and activates your account.',
  },
  {
    title: 'Tell us about your purchase',
    body: 'Once verified, send us the details of the photograph you bought. We confirm receipt straight away.',
  },
];

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const verify = typeof params.verify === 'string' ? params.verify : undefined;

  return (
    <main className="register-page full-screen flex flex-col overflow-y-auto">
      <NavBar />

      <div className="register-content flex-1 page-enter" style={{ padding: '14px 60px 72px' }}>
        <Reveal>
          <h1
            className="font-bold uppercase"
            style={{ color: '#FFFFFF', fontSize: 'clamp(1.5rem, 4vw, 3rem)', letterSpacing: '0.08em' }}
          >
            Register your print
          </h1>
          <div className="red-rule" style={{ margin: '12px 0 20px' }} />
          <p style={{ maxWidth: '62ch', marginBottom: 32, color: 'rgba(255, 255, 255, 0.72)', fontSize: '0.95rem', lineHeight: 1.65 }}>
            Every photograph leaves the studio as part of a numbered edition. Registering records you
            as its owner, so we can reach you about provenance, care and future editions.
          </p>
        </Reveal>

        <div className="register-layout">
          <RegisterClient countries={countryOptions()} verifyNotice={verify} />

          <Reveal delay={0.12}>
            <aside className="register-panel">
              <h2 className="register-section-title">How it works</h2>
              <div className="register-aside-list">
                {STEPS.map((step, index) => (
                  <div className="register-aside-item" key={step.title}>
                    <span className="register-step" aria-hidden="true">{index + 1}</span>
                    <div>
                      <h3>{step.title}</h3>
                      <p>{step.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </aside>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
