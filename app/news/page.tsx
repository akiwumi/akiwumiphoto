import type { Metadata } from 'next';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { createServerClient } from '@/lib/supabase-server';
import { paragraphs } from '@/lib/site-modals';
import type { SiteModal } from '@/types';

export const metadata: Metadata = {
  title: 'News | Eugene Akiwumi',
  description: 'Announcements, exhibitions and print releases from Eugene Akiwumi.',
};

/** Every announcement posted to News, newest first, once its start date has come. */
async function getNews(): Promise<SiteModal[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('site_modals')
      .select('*')
      .eq('show_on_news', true)
      .or(`starts_at.is.null,starts_at.lte.${new Date().toISOString()}`);
    if (error) throw error;
    return ((data ?? []) as SiteModal[]).sort((a, b) => Date.parse(postedOn(b)) - Date.parse(postedOn(a)));
  } catch (err) {
    console.error('[news] could not load news:', err);
    return [];
  }
}

const postedOn = (item: SiteModal) => item.starts_at ?? item.created_at;

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function NewsPage() {
  const news = await getNews();

  return (
    <main className="full-screen bg-black flex flex-col">
      <NavBar />
      <div className="site-page-heading"><h1>News</h1><p>Announcements, exhibitions and print releases.</p></div>
      <div className="news-list">
        {news.length === 0 && <p className="news-empty">Nothing to report yet. <Link href="/home">Browse the gallery</Link></p>}
        {news.map((item) => (
          <article key={item.id} id={item.id} className="news-item">
            <time dateTime={postedOn(item)}>{formatDate(postedOn(item))}</time>
            <div>
              <h2>{item.title}</h2>
              {paragraphs(item.body).map((text, i) => <p key={i}>{text}</p>)}
              {item.cta_label && item.cta_url && <Link href={item.cta_url} className="news-cta">{item.cta_label} ↗</Link>}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
