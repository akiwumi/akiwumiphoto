import fs from 'node:fs';
import XLSX from 'xlsx';
import { createClient } from '@supabase/supabase-js';

const envText = fs.readFileSync('.env.local', 'utf8');
const env = Object.fromEntries([...envText.matchAll(/^([A-Z0-9_]+)=(.*)$/gm)].map((match) => [match[1], match[2].replace(/^['"]|['"]$/g, '')]));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('Supabase URL/service key is not configured in .env.local');

const workbookPath = process.argv[2] || 'sweden_active_interior_design_contacts.xlsx';
const workbook = XLSX.readFile(workbookPath, { cellDates: false, raw: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
const clean = (value) => String(value ?? '').trim() || null;
const contacts = rows.map((row) => ({
  email: String(row['Public professional email'] || '').trim().toLowerCase(),
  display_name: clean(row['Contact name']),
  company_name: clean(row.Studio),
  role: clean(row.Role),
  city: clean(row.City),
  country: 'Sweden',
  website: clean(row.Website),
  source_url: clean(row['Contact/source page']),
  source: workbookPath,
  notes: clean(row['Verification note']),
})).filter((row) => row.email.includes('@'));
const unique = [...new Map(contacts.map((row) => [row.email, row])).values()];
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

const existingCheck = await client.from('outreach_contacts').select('email').limit(1);
if (existingCheck.error) throw new Error(`outreach_contacts is not ready in Supabase: ${existingCheck.error.message}`);
const batch = await client.from('outreach_import_batches').insert({ filename: workbookPath, source_label: 'verified Sweden interior-design contacts', row_count: unique.length, duplicate_count: contacts.length - unique.length, invalid_count: rows.length - contacts.length }).select('id').single();
if (batch.error) throw new Error(`outreach_import_batches is not ready in Supabase: ${batch.error.message}`);
const batchId = batch.data.id;

const existing = await client.from('outreach_contacts').select('email,contact_status').in('email', unique.map((row) => row.email));
if (existing.error) throw new Error(`Could not read existing contacts: ${existing.error.message}`);
const existingStatus = new Map((existing.data ?? []).map((row) => [row.email, row.contact_status]));
const payload = unique.map((row) => {
  const current = existingStatus.get(row.email);
  const status = current && !['imported', 'needs_review', 'approved'].includes(current) ? current : 'approved';
  const name = row.display_name || row.email;
  const [first, ...rest] = name.split(/\s+/);
  const notes = [row.role ? `Role: ${row.role}` : '', row.notes || ''].filter(Boolean).join(' · ') || null;
  return { email: row.email, first_name: first || null, last_name: rest.join(' ') || null, company_name: row.company_name, city: row.city, country: row.country, website: row.website, source: row.source, source_url: row.source_url, notes, approved_for_outreach: status !== 'suppressed', contact_status: status, import_batch_id: batchId };
});
const upsert = await client.from('outreach_contacts').upsert(payload, { onConflict: 'email' });
if (upsert.error) throw new Error(`Could not import contacts: ${upsert.error.message}`);
const updateBatch = await client.from('outreach_import_batches').update({ imported_count: payload.length }).eq('id', batchId);
if (updateBatch.error) throw new Error(`Contacts imported but batch update failed: ${updateBatch.error.message}`);
console.log(JSON.stringify({ imported: payload.length, duplicatesInWorkbook: contacts.length - unique.length, batchId }));
