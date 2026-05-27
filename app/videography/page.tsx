import NavBar from '@/components/NavBar';
import VideographyClient from './VideographyClient';
import { createServerClient } from '@/lib/supabase-server';
import { DEMO_VIDEOS } from '@/lib/demo-data';
import type { Video } from '@/types';

async function getVideos(): Promise<Video[]> {
  try {
    const supabase = createServerClient();
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
      <div style={{ height: 48, flexShrink: 0 }} />
      <VideographyClient videos={videos} />
    </main>
  );
}
