import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';
import { serviceClient } from '@/lib/stripe';

const MAX_IDS = 200;

export async function DELETE(request: Request) {
  try {
    await requireOutreachAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === 'OUTREACH_UNAUTHORIZED') {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Unable to authorize report deletion.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids)
    ? [...new Set(body.ids
      .filter((id): id is string => typeof id === 'string' && id.trim())
      .map((id) => id.trim()))]
    : [];

  if (ids.length === 0 || ids.length > MAX_IDS) {
    return NextResponse.json({ error: `Choose between 1 and ${MAX_IDS} delivery records.` }, { status: 422 });
  }

  const { error } = await serviceClient().from('outreach_deliveries').delete().in('id', ids);
  if (error) {
    return NextResponse.json({ error: error.message || 'Unable to erase delivery records.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedCount: ids.length });
}
