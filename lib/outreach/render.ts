import { MERGE_FIELDS, type MergeField } from '@/types/outreach';

export type MergeData = Partial<Record<MergeField, string | null>>;
const tagPattern = /{{\s*([a-z_]+)\s*}}/g;
function escapeHtml(value: string): string { return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
function escapeText(value: string): string { return value.replace(/[\u0000-\u001F\u007F]/g, ''); }
function replaceTemplate(template: string, data: MergeData, html: boolean): string {
  return template.replace(tagPattern, (_, field: string) => MERGE_FIELDS.includes(field as MergeField) ? (html ? escapeHtml(String(data[field as MergeField] ?? '')) : escapeText(String(data[field as MergeField] ?? ''))) : '');
}
export function renderMessage(input: { html: string; text?: string; subject: string; data: MergeData; }): { html: string; text: string; subject: string } {
  const data = { ...input.data, first_name: input.data.first_name?.trim() || null };
  const html = replaceTemplate(input.html, data, true);
  const text = replaceTemplate(input.text ?? input.html.replace(/<[^>]+>/g, ' '), data, false);
  const subject = replaceTemplate(input.subject, data, false);
  const unresolved = [html, text, subject].some((value) => /{{\s*[a-z_]+\s*}}/.test(value));
  if (unresolved) throw new Error('Template contains an unsupported merge tag');
  return { html, text, subject };
}
export function greeting(firstName?: string | null): string { return firstName?.trim() ? `Hello ${escapeText(firstName.trim())},` : 'Hello,'; }
export function imageWarnings(html: string): string[] {
  const urls = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((match) => match[1]);
  return urls.filter((url) => /^(file:|https?:\/\/localhost|https?:\/\/127\.0\.0\.1|\/|\.\.?\/)/i.test(url) || /signed|token=/i.test(url)).map((url) => `Image URL may expire or be unreachable: ${url}`);
}

