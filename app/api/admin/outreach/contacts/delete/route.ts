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

      const deletion = await client.rpc('outreach_delete_contacts_guarded', { p_contact_ids: null, p_category_id: categoryId });
      if (deletion.error) throw deletion.error;
      const row = deletion.data?.[0] ?? {};
      const deletedIds = Array.isArray(row.deleted_contact_ids) ? row.deleted_contact_ids : [];
      const protectedIds = Array.isArray(row.protected_contact_ids) ? row.protected_contact_ids : [];
      const categoryDeleted = row.category_deleted === true;
      const requestedCount = typeof row.requested_count === 'number' ? row.requested_count : deletedIds.length + protectedIds.length;
      const result: Result = { deletedCount: deletedIds.length, protectedCount: protectedIds.length, protectedIds, deletedIds, categoryDeleted };
      await audit(client, user?.id, 'delete_contact_category', 'outreach_contact_category', categoryId, {
        requested_count: requestedCount,
        deleted_count: result.deletedCount,
        protected_count: result.protectedCount,
        protected_ids: protectedIds,
        category_id: categoryId,
        category_name: category.data.name,
        category_deleted: categoryDeleted,
      });
      return response(result);
    }

    const deletion = await client.rpc('outreach_delete_contacts_guarded', { p_contact_ids: contactIds, p_category_id: null });
    if (deletion.error) throw deletion.error;
    const row = deletion.data?.[0] ?? {};
    const deletedIds = Array.isArray(row.deleted_contact_ids) ? row.deleted_contact_ids : [];
    const protectedIds = Array.isArray(row.protected_contact_ids) ? row.protected_contact_ids : [];
    const requestedCount = typeof row.requested_count === 'number' ? row.requested_count : contactIds.length;
    const result: Result = { deletedCount: deletedIds.length, protectedCount: protectedIds.length, protectedIds, deletedIds, categoryDeleted: false };
    await audit(client, user?.id, 'delete_contacts', 'outreach_contact', null, {
      requested_count: requestedCount,
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
