import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import NavBar from './NavBar';
import PageBlocks from './PageBlocks';
import { firstText, parseBlocks } from '@/lib/page-blocks';
import type { PublishedPage } from '@/lib/site-pages';

const pathOf = ({ page, parent }: PublishedPage) => (parent ? `/${parent.slug}/${page.slug}` : `/${page.slug}`);

export function createdPageMetadata(data: PublishedPage | null): Metadata {
  if (!data) return {};
  const { page, parent } = data;
  const name = parent ? `${page.title} — ${parent.title}` : page.title;
  const title = `${name} | Eugene Akiwumi`;
  const description = page.seo_description || page.intro || firstText(parseBlocks(page.blocks)) || undefined;
  const url = pathOf(data);
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title, description, type: 'article', url,
      ...(page.cover_image ? { images: [{ url: page.cover_image, alt: page.title, width: page.cover_width ?? undefined, height: page.cover_height ?? undefined }] } : {}),
    },
  };
}

/** A page made in the admin: heading, optional cover, content blocks, then its sub pages. */
export default function CreatedPageView({ data }: { data: PublishedPage }) {
  const { page, parent, subPages } = data;
  const blocks = parseBlocks(page.blocks);
  const hasCover = Boolean(page.cover_image && page.cover_width && page.cover_height);

  return (
    <main className="full-screen bg-black flex flex-col">
      <NavBar />
      <article className="created-page">
        <header className="site-page-heading">
          {parent && (
            <nav aria-label="Breadcrumb" className="created-page-breadcrumb">
              <Link href={`/${parent.slug}`}>{parent.title}</Link> <span aria-hidden="true">/</span>
            </nav>
          )}
          <h1>{page.title}</h1>
          {page.intro && <p>{page.intro}</p>}
        </header>

        {hasCover && (
          <div className="created-page-cover">
            <Image src={page.cover_image!} alt="" width={page.cover_width!} height={page.cover_height!}
              sizes="(max-width: 1200px) 100vw, 1100px" preload fetchPriority="high" />
          </div>
        )}

        <PageBlocks blocks={blocks} eagerFirstImage={!hasCover} />

        {subPages.length > 0 && (
          <section className="created-subpages" aria-labelledby="subpages-title">
            <h2 id="subpages-title">In {page.title}</h2>
            <div className="created-subpages-grid">
              {subPages.map((sub) => (
                <Link key={sub.id} href={`/${page.slug}/${sub.slug}`} className="created-subpage">
                  <div className="created-subpage-image">
                    {sub.cover_image && (
                      <Image src={sub.cover_image} alt="" fill sizes="(max-width: 700px) 100vw, 33vw" loading="lazy" />
                    )}
                  </div>
                  <h3>{sub.title} <span aria-hidden="true">↗</span></h3>
                  {sub.intro && <p>{sub.intro}</p>}
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>
    </main>
  );
}
