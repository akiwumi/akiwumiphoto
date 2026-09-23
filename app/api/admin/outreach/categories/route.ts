import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';
import { getOutreachContactCategories } from '@/lib/outreach/categories-server';
import { trimCategoryName } from '@/lib/outreach/categories';

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

export async function GET() {
  try {
    await requireOutreachAdmin();
    return NextResponse.json({ categories: await getOutreachContactCategories() });
  } catch {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const { client } = await requireOutreachAdmin();
    const body = await request.json().catch(() => null);
    const name = typeof body?.name === 'string' ? trimCategoryName(body.name) : '';
    if (!name) return NextResponse.json({ error: 'Category name is required.' }, { status: 422 });
    if (!client) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

    const findExisting = () => client.from('outreach_contact_categories').select('id,name').ilike('name', escapeLike(name)).maybeSingle();
    const existing = await findExisting();
    if (existing.error) throw existing.error;
    if (existing.data) return NextResponse.json({ category: existing.data });

    const inserted = await client.from('outreach_contact_categories').insert({ name }).select('id,name').single();
    if (inserted.error) {
      if (inserted.error.code === '23505') {
        const winner = await findExisting();
        if (winner.error) throw winner.error;
        if (winner.data) return NextResponse.json({ category: winner.data });
      }
      throw inserted.error;
    }
    return NextResponse.json({ category: inserted.data }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: message === 'OUTREACH_UNAUTHORIZED' ? 'Unauthorized' : 'Could not save category.' }, { status: message === 'OUTREACH_UNAUTHORIZED' ? 401 : 400 });
  }
}
