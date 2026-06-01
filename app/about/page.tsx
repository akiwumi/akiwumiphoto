import NavBar from '@/components/NavBar';
import Image from 'next/image';
import { createServerClient } from '@/lib/supabase-server';
import Reveal from '@/components/Reveal';

async function getAboutContent(): Promise<{ heading: string; bio: string; portrait: string | null }> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from('page_content')
      .select('key, value')
      .eq('page', 'about');
    const rows = data || [];
    const heading = rows.find((r) => r.key === 'heading')?.value || '';
    const bio = rows.find((r) => r.key === 'bio')?.value || '';
    const portrait = rows.find((r) => r.key === 'portrait_image')?.value || null;
    return { heading, bio, portrait };
  } catch {
    return { heading: '', bio: '', portrait: null };
  }
}

export default async function AboutPage() {
  const { heading, bio, portrait } = await getAboutContent();

  return (
    <main className="about-page full-screen bg-white flex flex-col overflow-hidden">
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />

      <div className="about-content flex-1 flex flex-col overflow-hidden page-enter" style={{ padding: '14px 60px 40px' }}>
        {/* Header */}
        <h1
          className="text-black font-bold uppercase mb-3"
          style={{ fontSize: 'clamp(1.5rem, 3vw, 2.5rem)', letterSpacing: '0.08em', flexShrink: 0 }}
        >
          ABOUT
        </h1>
        <div className="red-rule mb-4" style={{ flexShrink: 0 }} />

        {/* Two equal columns — portrait reveals first, bio staggered after */}
        <div
          className="about-layout flex-1 overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 30,
            minHeight: 0,
          }}
        >
          {/* Portrait */}
          <Reveal delay={0.05}>
            <div className="about-portrait gallery-tile" style={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
              {portrait && (
                <Image
                  src={portrait}
                  alt="Akiwumi — photographer portrait"
                  fill
                  className="object-cover object-center media-zoom"
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                />
              )}
            </div>
          </Reveal>

          {/* Bio */}
          <Reveal delay={0.18}>
            <div className="about-bio flex flex-col justify-center overflow-hidden h-full">
              {heading && (
                <h2
                  className="text-black font-bold uppercase mb-4"
                  style={{ fontSize: 'clamp(1rem, 1.8vw, 1.4rem)', letterSpacing: '0.08em' }}
                >
                  {heading}
                </h2>
              )}
              <div
                className="about-bio-copy text-black text-sm leading-relaxed space-y-4"
                style={{ whiteSpace: 'pre-wrap' }}
              >
                {bio}
              </div>
              <div className="h-0.5 bg-black mt-6" />
            </div>
          </Reveal>
        </div>
      </div>
    </main>
  );
}
