import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase-server';
import { signUrl } from '@/lib/signed-urls';
import styles from './page.module.css';
import NavBar from '@/components/NavBar';
import SiteFooter from '@/components/SiteFooter';
import { fetchHiddenPages } from '@/lib/site-visibility';

const introduction = 'Stockholm-based photographer and filmmaker documenting people, culture and place.';

export const metadata: Metadata = {
  title: 'Stockholm Photographer & Filmmaker | Eugene Akiwumi',
  description: introduction,
  openGraph: {
    title: 'Eugene Akiwumi — Photography & Film',
    description: introduction,
    type: 'website',
  },
};

async function getSelectedProjects() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('galleries')
      .select('id, title, slug, cover_image')
      .eq('published', true)
      .not('cover_image', 'is', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })
      .limit(3);
    if (error) throw error;
    return await Promise.all((data || []).map(async (project) => ({
      ...project,
      cover_image: await signUrl(project.cover_image),
    })));
  } catch (error) {
    console.error('[homepage] could not load selected projects:', error);
    return [];
  }
}

export default async function HomePage() {
  const [projects, hidden] = await Promise.all([getSelectedProjects(), fetchHiddenPages()]);
  const shown = (key: string) => !hidden.includes(key);

  return (
    <main className={styles.page}>
      <NavBar contained />

      <section className={styles.introduction} aria-labelledby="intro-title">
        <p className={styles.eyebrow}>Eugene Akiwumi · Photography & Film</p>
        <h1 id="intro-title">{introduction}</h1>
      </section>

      {shown('gallery') && <>
      <section aria-label="Selected photographs" className={styles.projects}>
        {projects.length > 0 ? projects.map((project, index) => (
          <Link key={project.id} href={`/gallery/${project.slug}`} className={styles.project}>
            <div className={styles.photograph}>
              <Image src={project.cover_image!} alt={project.title} fill unoptimized
                preload={index === 0} loading="eager" sizes="(max-width: 700px) 100vw, 33vw" />
              <div className={styles.caption}><span>{project.title}</span></div>
            </div>
          </Link>
        )) : (
          <Link href="/home" className={`${styles.project} ${styles.fallback}`}>
            <div className={styles.photograph}>
              <Image src="/images/intro-background.jpg" alt="Selected photography by Eugene Akiwumi" fill preload sizes="100vw" />
              <div className={styles.caption}><span>Explore the photography</span></div>
            </div>
          </Link>
        )}
      </section>

      <div className={styles.archiveLink}><Link href="/home">View the full gallery <span aria-hidden="true">↗</span></Link></div>
      </>}

      {shown('services') && <section id="services" className={styles.services} aria-labelledby="services-title">
        <div>
          <p className={styles.eyebrow}>Services</p>
          <h2 id="services-title">Let’s make<br />something meaningful.</h2>
          {shown('contact') && <Link href="/contact?subject=Commission" className={styles.contactLink}>Discuss a project <span aria-hidden="true">↗</span></Link>}
        </div>
        <div className={styles.serviceList}>
          <article><h3>Portrait photography</h3><p>Portraits of people, artists and creative communities.</p>{shown('gallery') && <Link href="/home">Explore photography ↗</Link>}</article>
          <article><h3>Documentary & editorial</h3><p>Photographic stories about people, culture and place.</p>{shown('gallery') && <Link href="/home">Explore the gallery ↗</Link>}</article>
          <article><h3>Film & moving image</h3><p>Documentaries, music videos and commercial filmmaking.</p>{shown('videography') && <Link href="/videography">Watch films ↗</Link>}</article>
        </div>
      </section>}
      <SiteFooter contained />
    </main>
  );
}
