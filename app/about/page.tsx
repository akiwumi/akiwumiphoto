import NavBar from '@/components/NavBar';
import Image from 'next/image';
import { createServerClient } from '@/lib/supabase-server';
import portraitSrc from '@/public/images/portrait.jpg';
import Reveal from '@/components/Reveal';

async function getBio(): Promise<string> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('page_content')
      .select('value')
      .eq('page', 'about')
      .eq('key', 'bio')
      .single();
    return data?.value || DEFAULT_BIO;
  } catch {
    return DEFAULT_BIO;
  }
}

const DEFAULT_BIO = `Eugene "Pebbles" Akiwumi is a filmmaker and photographer whose work is shaped by a life lived across continents. Born in Nigeria and having called London, Lagos, and cities across Europe and North America home, his lens reflects the restlessness of a genuinely global perspective — the textures of place, the weight of movement, and the quiet intensity of people caught between worlds.

His photography moves between documentary portraiture and fine-art landscape, grounded in the belief that the most honest images come from proximity and patience. As a filmmaker, he brings the same instinct — long observation, precise timing, and an ear for the story underneath the story.

Akiwumi's work has been shown internationally, and his prints are held in private collections across three continents. He is available for commissions, editorial projects, and creative collaboration.`;

export default async function AboutPage() {
  const bio = await getBio();

  return (
    <main className="full-screen bg-white flex flex-col overflow-hidden">
      <NavBar />
      <div style={{ height: 48, flexShrink: 0 }} />

      <div className="flex-1 flex flex-col overflow-hidden page-enter" style={{ padding: '14px 60px 40px' }}>
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
          className="flex-1 overflow-hidden"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 30,
            minHeight: 0,
          }}
        >
          {/* Portrait — reveals with image-reveal scale effect */}
          <Reveal delay={0.05}>
            <div className="gallery-tile" style={{ position: 'relative', overflow: 'hidden', height: '100%' }}>
              <Image
                src={portraitSrc}
                alt="Akiwumi — photographer portrait"
                fill
                className="object-cover object-center media-zoom"
                sizes="(max-width: 768px) 100vw, 50vw"
                priority
              />
            </div>
          </Reveal>

          {/* Bio — staggered after portrait */}
          <Reveal delay={0.18}>
            <div className="flex flex-col justify-center overflow-hidden h-full">
              <div
                className="text-black text-sm leading-relaxed space-y-4"
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
