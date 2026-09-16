import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import CreatedPageView, { createdPageMetadata } from '@/components/CreatedPageView';
import { fetchPublishedPage } from '@/lib/site-pages';

interface Props {
  params: Promise<{ slug: string }>;
}

// Built-in routes (/about, /prints, ...) match before this one.
const load = cache((slug: string) => fetchPublishedPage(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return createdPageMetadata(await load((await params).slug));
}

export default async function CreatedPage({ params }: Props) {
  const data = await load((await params).slug);
  if (!data) notFound();
  return <CreatedPageView data={data} />;
}
