import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import CreatedPageView, { createdPageMetadata } from '@/components/CreatedPageView';
import { fetchPublishedPage } from '@/lib/site-pages';

interface Props {
  params: Promise<{ slug: string; child: string }>;
}

const load = cache((slug: string, child: string) => fetchPublishedPage(child, slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, child } = await params;
  return createdPageMetadata(await load(slug, child));
}

export default async function CreatedSubPage({ params }: Props) {
  const { slug, child } = await params;
  const data = await load(slug, child);
  if (!data) notFound();
  return <CreatedPageView data={data} />;
}
