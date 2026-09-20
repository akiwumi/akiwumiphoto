import { NextResponse } from 'next/server';
import { parseWorkbook, autoMapColumns } from '@/lib/outreach/import';
import { requireOutreachAdmin } from '@/lib/outreach/auth';

function splitName(value: string | null): { first_name: string | null; last_name: string | null } {
  const name = value?.trim() || '';
  if (!name) return { first_name: null, last_name: null };
  const [first, ...rest] = name.split(/\s+/);
  return { first_name: first, last_name: rest.length ? rest.join(' ') : null };
}

export async function POST(request: Request) {
  try {
    const { client, user } = await requireOutreachAdmin();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ error: 'Only .xlsx files are accepted.' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'Workbook is too large.' }, { status: 413 });
    const buffer = await file.arrayBuffer();
    const mappingValue = String(form.get('mapping') ?? '');
    const mapping = mappingValue ? JSON.parse(mappingValue) : undefined;
    const parsedWithoutMapping = parseWorkbook(buffer, mapping ?? {});
    const effectiveMapping = mapping && Object.keys(mapping).length > 0 ? mapping : autoMapColumns(parsedWithoutMapping.columns);
    const parsed = mappingValue || Object.keys(effectiveMapping).length ? parseWorkbook(buffer, effectiveMapping) : parsedWithoutMapping;
    const shouldCommit = String(form.get('commit') ?? '') === '1';
    if (!shouldCommit) return NextResponse.json({ ...parsed, mapping: effectiveMapping, preview: parsed.rows.slice(0, 20) });
    if (!client) return NextResponse.json({ error: 'Supabase is not configured for persistent imports.' }, { status: 503 });
    if (parsed.summary.invalidCount > 0) return NextResponse.json({ error: 'Fix invalid or missing email rows before importing.', ...parsed, mapping: effectiveMapping, preview: parsed.rows.slice(0, 20) }, { status: 422 });

    const batchInsert = await client.from('outreach_import_batches').insert({ filename: file.name, source_label: 'address book import', row_count: parsed.summary.rowCount, duplicate_count: parsed.summary.duplicateCount, invalid_count: parsed.summary.invalidCount, created_by: user?.id ?? null }).select('id').single();
    if (batchInsert.error) throw batchInsert.error;
    const batchId = batchInsert.data.id as string;
    const emails = parsed.rows.map((row) => row.email).filter((email): email is string => Boolean(email));
    const existingResult = await client.from('outreach_contacts').select('email,contact_status,suppressed_at').in('email', emails);
    if (existingResult.error) throw existingResult.error;
    const existingByEmail = new Map((existingResult.data ?? []).map((row) => [row.email, row]));
    const contacts = parsed.rows.map((row) => {
      const name = row.display_name || [row.first_name, row.last_name].filter(Boolean).join(' ') || null;
      const split = splitName(name);
      const existing = existingByEmail.get(row.email!);
      const preservedStatus = existing?.contact_status && !['imported', 'needs_review', 'approved'].includes(existing.contact_status) ? existing.contact_status : 'approved';
      const notes = [row.role ? `Role: ${row.role}` : '', row.notes || ''].filter(Boolean).join(' · ') || null;
      return { email: row.email, first_name: split.first_name, last_name: split.last_name, company_name: row.company_name, city: row.city, country: row.country, website: row.website, source: row.source || file.name, source_url: row.source_url, notes, approved_for_outreach: preservedStatus !== 'suppressed', contact_status: preservedStatus, import_batch_id: batchId };
    });
    const upsert = await client.from('outreach_contacts').upsert(contacts, { onConflict: 'email' });
    if (upsert.error) throw upsert.error;
    await client.from('outreach_import_batches').update({ imported_count: contacts.length }).eq('id', batchId);
    await client.from('outreach_audit_log').insert({ actor_id: user?.id ?? null, action: 'import_contacts', entity_type: 'outreach_import_batch', entity_id: batchId, metadata: { filename: file.name, imported_count: contacts.length, duplicate_count: parsed.summary.duplicateCount, approved_immediately: true } });
    return NextResponse.json({ ok: true, importedCount: contacts.length, duplicateCount: parsed.summary.duplicateCount, batchId, message: `${contacts.length} contacts imported into Supabase and approved for outreach.` });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not import workbook.';
    return NextResponse.json({ error: message === 'OUTREACH_UNAUTHORIZED' ? 'Unauthorized' : message }, { status: message === 'OUTREACH_UNAUTHORIZED' ? 401 : 400 });
  }
}
