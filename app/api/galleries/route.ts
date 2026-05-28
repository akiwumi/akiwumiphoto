import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from('galleries')
      .select('id, title, slug, description, cover_image, sort_order')
      .eq('published', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Failed to fetch galleries' }, { status: 500 });
  }
}
