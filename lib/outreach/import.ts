import * as XLSX from 'xlsx';
import { cleanCell, isValidEmail, normalizeEmail } from './domain';
export const CANONICAL_FIELDS = ['email','first_name','last_name','company_name','city','country','website','source','source_url','notes'] as const;
export type CanonicalField = typeof CANONICAL_FIELDS[number];
export type ImportRow = Record<CanonicalField, string | null> & { rowNumber: number; valid: boolean; issues: string[]; duplicate: boolean };
export function parseWorkbook(buffer: ArrayBuffer, mapping: Partial<Record<string, CanonicalField>>): { columns: string[]; rows: ImportRow[]; summary: { rowCount: number; validCount: number; invalidCount: number; duplicateCount: number } } {
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false, sheetRows: 1001 }); const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error('Workbook has no worksheet'); const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false, blankrows: false });
  const columns = Object.keys(records[0] ?? {});
  const seen = new Set<string>();
  const rows = records.slice(0, 1000).map((record, index) => {
    const row = Object.fromEntries(CANONICAL_FIELDS.map((field) => {
      const sourceColumn = Object.entries(mapping).find(([, target]) => target === field)?.[0];
      return [field, cleanCell(sourceColumn ? record[sourceColumn] : null)];
    })) as Record<CanonicalField, string | null>;
    row.email = normalizeEmail(row.email);
    const issues: string[] = [];
    if (!isValidEmail(row.email)) issues.push('Email is invalid or missing');
    const duplicate = !!row.email && seen.has(row.email);
    if (duplicate) issues.push('Duplicate email in workbook');
    if (row.email) seen.add(row.email);
    return { ...row, rowNumber: index + 2, valid: issues.length === 0, issues, duplicate };
  });
  return { columns, rows, summary: { rowCount: rows.length, validCount: rows.filter((row) => row.valid).length, invalidCount: rows.filter((row) => !row.valid).length, duplicateCount: rows.filter((row) => row.duplicate).length } };
}
