import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client } = await requireOutreachAdmin();
    const { id } = await params;
    const body = await request.json().catch(() => null);
    const categoryId = body?.categoryId;
    if (!UUID.test(id) || !(categoryId === null || (typeof categoryId === 'string' && UUID.test(categoryId)))) {
      return NextResponse.json({ error: 'A valid contact and category are required.' }, { status: 422 });
    }

    if (!client) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });
    if (categoryId) {
      const category = await client.from('outreach_contact_categories').select('id').eq('id', categoryId).maybeSingle();
      if (category.error) throw category.error;
      if (!category.data) return NextResponse.json({ error: 'Choose a valid contact category.' }, { status: 422 });
    }
    const updated = await client.from('outreach_contacts').update({ category_id: categoryId }).eq('id', id).select('id,category_id').maybeSingle();
    if (updated.error) throw updated.error;
    if (!updated.data) return NextResponse.json({ error: 'Contact not found.' }, { status: 404 });
    return NextResponse.json({ contactId: id, categoryId });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    return NextResponse.json({ error: message === 'OUTREACH_UNAUTHORIZED' ? 'Unauthorized' : 'Could not update contact category.' }, { status: message === 'OUTREACH_UNAUTHORIZED' ? 401 : 400 });
  }
}
