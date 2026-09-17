import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { createServerClient } from '@/lib/supabase-server';
import { signItems } from '@/lib/signed-urls';
import { fetchHiddenPages } from '@/lib/site-visibility';
import styles from './page.module.css';

const PATH = '/portrait-photographer-stockholm';
const description = 'Portrait photography in Stockholm by Eugene Akiwumi: natural, unhurried portraits of people, artists, musicians and creative professionals.';

export const metadata: Metadata = {
  title: 'Portrait Photographer in Stockholm | Eugene Akiwumi',
  description,
  alternates: { canonical: PATH },
  openGraph: { title: 'Portrait Photographer in Stockholm | Eugene Akiwumi', description, type: 'website', url: PATH },
};

/** A selection from the Portraits gallery, in its gallery order. */
async function getPortraits() {
  try {
    const supabase = await createServerClient();
    const { data: gallery } = await supabase
      .from('galleries')
      .select('id')
      .eq('slug', 'portraits')
      .eq('published', true)
      .maybeSingle();
    if (!gallery) return [];
    const { data, error } = await supabase
      .from('gallery_images')
      .select('id, storage_path, title')
      .eq('gallery_id', gallery.id)
      .order('sort_order', { ascending: true })
      .limit(6);
    if (error) throw error;
    return await signItems(data ?? []);
  } catch (err) {
    console.error('[portraits-stockholm] could not load portraits:', err);
    return [];
  }
}

export default async function PortraitPhotographerStockholmPage() {
  const [portraits, hidden] = await Promise.all([getPortraits(), fetchHiddenPages()]);
  const shown = (key: string) => !hidden.includes(key);

  return (
    <main className="full-screen bg-black flex flex-col">
      <NavBar />
      <article className={styles.page}>
        <header className={styles.intro}>
          <p className={styles.eyebrow}>Portrait photography · Stockholm</p>
          <h1>Portrait photographer in Stockholm</h1>
          <p className={styles.lede}>
            I’m Eugene Akiwumi, a British-Ghanaian photographer and filmmaker based in Stockholm. I make portraits
            that feel like the person in them: relaxed, honest and shaped by a gesture or an expression rather than a pose.
          </p>
          {shown('contact') && (
            <Link href="/contact?subject=Commission" className={styles.cta}>Enquire about a portrait session <span aria-hidden="true">↗</span></Link>
          )}
        </header>

        {portraits.length > 0 && (
          <section className={styles.grid} aria-label="Selected portraits">
            {portraits.map((portrait, index) => (
              <figure key={portrait.id} className={styles.photograph}>
                <Image src={portrait.storage_path} alt={portrait.title?.trim() || 'Portrait by Eugene Akiwumi'} fill unoptimized
                  loading={index < 3 ? 'eager' : 'lazy'} sizes="(max-width: 700px) 100vw, 33vw" />
              </figure>
            ))}
          </section>
        )}
        {shown('gallery') && portraits.length > 0 && (
          <p className={styles.more}><Link href="/gallery/portraits">See the full portrait gallery <span aria-hidden="true">↗</span></Link></p>
        )}

        <section className={styles.columns}>
          <div>
            <h2>Who I photograph</h2>
            <p>
              Musicians, artists, creative professionals and anyone who wants a portrait with some life in it. My work
              has ranged from the Ghanaian hip hop duo The FOKN Bois to dancers for a Stockholm street dance festival,
              alongside documentary films, music videos and commercials.
            </p>
          </div>
          <div>
            <h2>How I work</h2>
            <p>
              Coming from documentary and film, I pay attention to people more than to set-ups. We’ll talk first about
              what the portraits are for, then find a place in Stockholm that suits you, whether that’s outdoors, at
              your home or where you work.
            </p>
          </div>
          <div>
            <h2>Get in touch</h2>
            <p>
              Tell me who the portraits are for, how you plan to use them and when you’d like to shoot. I’ll reply with
              availability and a quote.
            </p>
            {shown('contact') && <Link href="/contact?subject=Commission" className={styles.cta}>Send an enquiry <span aria-hidden="true">↗</span></Link>}
          </div>
        </section>
      </article>
    </main>
  );
}
