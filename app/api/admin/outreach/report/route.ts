import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';
import { serviceClient } from '@/lib/stripe';

const MAX_IDS = 200;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim()))]
    : [];

  if (ids.length === 0 || ids.length > MAX_IDS || ids.some((id) => !UUID_RE.test(id))) {
    return NextResponse.json({ error: `Choose between 1 and ${MAX_IDS} delivery records.` }, { status: 422 });
  }

  try {
    const { error } = await serviceClient().from('outreach_deliveries').delete().in('id', ids);
    if (error) {
      console.error('[outreach-report] could not erase delivery records:', error);
      return NextResponse.json({ error: 'Unable to erase delivery records.' }, { status: 500 });
    }
  } catch (error) {
    console.error('[outreach-report] could not erase delivery records:', error);
    return NextResponse.json({ error: 'Unable to erase delivery records.' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedCount: ids.length });
}
