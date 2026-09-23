import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';
import { trimCategoryName } from '@/lib/outreach/categories';

const MAX_CONTACT_IDS = 500;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Result = {
  deletedCount: number;
  protectedCount: number;
  protectedIds: string[];
  deletedIds: string[];
  categoryDeleted: boolean;
};

function uniqueIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .filter((id): id is string => typeof id === 'string')
    .map((id) => id.trim())
    .filter(Boolean))];
}

function response(result: Result) {
  return NextResponse.json({ ok: true, ...result });
}

async function getProtectedIds(client: any, contactIds: string[]): Promise<string[]> {
  if (!contactIds.length) return [];
  const deliveries = await client.from('outreach_deliveries').select('contact_id').in('contact_id', contactIds);
  if (deliveries.error) throw deliveries.error;
  return [...new Set((deliveries.data ?? [])
    .map((delivery: { contact_id?: unknown }) => delivery.contact_id)
    .filter((id: unknown): id is string => typeof id === 'string' && contactIds.includes(id)) as string[])];
}

async function audit(client: any, actorId: string | null | undefined, action: string, entityType: string, entityId: string | null, metadata: Record<string, unknown>) {
  const result = await client.from('outreach_audit_log').insert({ actor_id: actorId ?? null, action, entity_type: entityType, entity_id: entityId, metadata });
  if (result.error) throw result.error;
}

export async function POST(request: Request) {
  let auth: Awaited<ReturnType<typeof requireOutreachAdmin>>;
  try {
    auth = await requireOutreachAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === 'OUTREACH_UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    return NextResponse.json({ error: 'Unable to authorize contact deletion.' }, { status: 500 });
  }

  const body = await request.json().catch(() => null) as { contactIds?: unknown; categoryId?: unknown; categoryName?: unknown } | null;
  const contactIds = uniqueIds(body?.contactIds);
  const categoryId = typeof body?.categoryId === 'string' ? body.categoryId.trim() : '';
  const categoryName = typeof body?.categoryName === 'string' ? trimCategoryName(body.categoryName) : '';
  const deletingCategory = Boolean(categoryId || categoryName);

  if ((!deletingCategory && (!contactIds.length || contactIds.length > MAX_CONTACT_IDS || contactIds.some((id) => !UUID_RE.test(id))))
    || (deletingCategory && (contactIds.length > 0 || !UUID_RE.test(categoryId) || !categoryName))) {
    return NextResponse.json({ error: `Choose between 1 and ${MAX_CONTACT_IDS} valid contacts, or a category with its exact name.` }, { status: 422 });
  }
  if (!auth.client) return NextResponse.json({ error: 'Supabase is not configured.' }, { status: 503 });

  const { client, user } = auth;
  try {
    if (deletingCategory) {
      const category = await client.from('outreach_contact_categories').select('id,name').eq('id', categoryId).maybeSingle();
      if (category.error) throw category.error;
      if (!category.data) return NextResponse.json({ error: 'Contact category not found.' }, { status: 404 });
      if (trimCategoryName(category.data.name) !== categoryName || category.data.name !== categoryName) {
        return NextResponse.json({ error: 'Type the exact category name to delete it.' }, { status: 422 });
      }

      const contacts = await client.from('outreach_contacts').select('id').eq('category_id', categoryId);
      if (contacts.error) throw contacts.error;
      const ids = (contacts.data ?? []).map((contact: { id?: unknown }) => contact.id).filter((id: unknown): id is string => typeof id === 'string');
      const protectedIds = await getProtectedIds(client, ids);
      const eligibleIds = ids.filter((id) => !protectedIds.includes(id));

      if (eligibleIds.length) {
        const deleted = await client.from('outreach_contacts').delete().in('id', eligibleIds);
        if (deleted.error) throw deleted.error;
      }

      let categoryDeleted = false;
      if (!protectedIds.length) {
        const deletedCategory = await client.from('outreach_contact_categories').delete().eq('id', categoryId);
        if (deletedCategory.error) throw deletedCategory.error;
        categoryDeleted = true;
      }
      const result: Result = { deletedCount: eligibleIds.length, protectedCount: protectedIds.length, protectedIds, deletedIds: eligibleIds, categoryDeleted };
      await audit(client, user?.id, 'delete_contact_category', 'outreach_contact_category', categoryId, {
        requested_count: ids.length,
        deleted_count: result.deletedCount,
        protected_count: result.protectedCount,
        protected_ids: protectedIds,
        category_id: categoryId,
        category_name: category.data.name,
        category_deleted: categoryDeleted,
      });
      return response(result);
    }

    const contacts = await client.from('outreach_contacts').select('id').in('id', contactIds);
    if (contacts.error) throw contacts.error;
    const existingIds = (contacts.data ?? []).map((contact: { id?: unknown }) => contact.id).filter((id: unknown): id is string => typeof id === 'string');
    const protectedIds = await getProtectedIds(client, existingIds);
    const eligibleIds = existingIds.filter((id) => !protectedIds.includes(id));
    if (eligibleIds.length) {
      const deleted = await client.from('outreach_contacts').delete().in('id', eligibleIds);
      if (deleted.error) throw deleted.error;
    }
    const result: Result = { deletedCount: eligibleIds.length, protectedCount: protectedIds.length, protectedIds, deletedIds: eligibleIds, categoryDeleted: false };
    await audit(client, user?.id, 'delete_contacts', 'outreach_contact', null, {
      requested_count: contactIds.length,
      deleted_count: result.deletedCount,
      protected_count: result.protectedCount,
      protected_ids: protectedIds,
    });
    return response(result);
  } catch (error) {
    console.error('[outreach-contacts] could not delete contacts:', error);
    return NextResponse.json({ error: 'Unable to delete contacts.' }, { status: 500 });
  }
}
