import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import VideographyClient from './VideographyClient';
import { createServerClient } from '@/lib/supabase-server';
import { DEMO_VIDEOS } from '@/lib/demo-data';
import type { Video } from '@/types';

export const metadata: Metadata = {
  title: 'Films & Music Videos | Eugene Akiwumi, Stockholm Filmmaker',
  description: 'Documentaries, music videos, commercials and social-impact films directed by Eugene Akiwumi.',
  alternates: { canonical: '/videography' },
};

async function getVideos(): Promise<Video[]> {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('published', true)
      .order('sort_order', { ascending: true });
    if (error) throw error;
    const result = data || [];
    return result.length > 0 ? result : DEMO_VIDEOS;
  } catch {
    return DEMO_VIDEOS;
  }
}

export default async function VideographyPage() {
  const videos = await getVideos();

  return (
    <main className="full-screen bg-black flex flex-col overflow-hidden">
      <NavBar />
      <VideographyClient videos={videos} />
    </main>
  );
}
