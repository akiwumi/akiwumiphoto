# Address-book CSV and drag-and-drop import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import valid address-book contacts from CSV or XLSX with an accessible drag-and-drop picker while reporting, rather than blocking on, bad email rows.

**Architecture:** Extend the existing SheetJS parser and import route; no new parsing library or persistence table is needed. The route filters `ImportRow`s marked invalid before batch creation and upsert, then returns their row-level issues. The client owns the drag-and-drop state and renders the server summary using existing outreach styles.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, SheetJS (`xlsx`), Supabase, Node built-in test runner.

---

### Task 1: Make parser behavior explicit for CSV and skipped rows

**Files:**
- Modify: `tests/outreach-import.test.cjs`
- Modify: `lib/outreach/import.ts`

- [ ] **Step 1: Write failing parser tests for CSV and skip metadata**

```js
test('parses a CSV file after title rows and marks only invalid email rows', () => {
  const csv = [
    'Gallery contact export',
    'Company,Email',
    'North Gallery,hello@north.test',
    'No Inbox,',
    'Bad Inbox,not-an-email',
  ].join('\n');
  const result = parseWorkbook(Buffer.from(csv), autoMapColumns(parseWorkbook(Buffer.from(csv), {}).columns));

  assert.equal(result.summary.rowCount, 3);
  assert.equal(result.summary.validCount, 1);
  assert.equal(result.summary.invalidCount, 2);
  assert.deepEqual(result.rows.filter((row) => !row.valid).map((row) => ({ rowNumber: row.rowNumber, issues: row.issues })), [
    { rowNumber: 4, issues: ['Email is invalid or missing'] },
    { rowNumber: 5, issues: ['Email is invalid or missing'] },
  ]);
});
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `node --test tests/outreach-import.test.cjs`

Expected: FAIL because the current fixture’s title row is treated as the header or CSV parsing does not preserve the expected row outcome.

- [ ] **Step 3: Implement the minimal CSV-safe parser adjustment**

In `lib/outreach/import.ts`, make `findHeaderRow` detect a row containing any known canonical/aliased column header, not only an email alias. Preserve the current `XLSX.read(buffer, { type: 'array' })` path so CSV and XLSX share SheetJS parsing.

```ts
function findHeaderRow(sheet: XLSX.WorkSheet): number {
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: false, blankrows: true });
  const knownHeaders = new Set(Object.values(COLUMN_ALIASES).flat().map(normalizedColumn));
  const headerRow = rows.findIndex((row) => row.some((cell) => knownHeaders.has(normalizedColumn(String(cell ?? '')))));
  return headerRow >= 0 ? headerRow : 0;
}
```

- [ ] **Step 4: Run parser tests to verify they pass**

Run: `node --test tests/outreach-import.test.cjs`

Expected: PASS, including the existing XLSX title-row test and the new CSV case.

- [ ] **Step 5: Commit parser behavior**

```bash
git add lib/outreach/import.ts tests/outreach-import.test.cjs
git commit -m "feat: parse csv address book imports"
```

### Task 2: Import valid rows even when a file contains invalid email rows

**Files:**
- Modify: `tests/outreach-import.test.cjs`
- Modify: `app/api/admin/outreach/import/route.ts`

- [ ] **Step 1: Write a failing route test for partial import**

```js
test('commit imports valid rows and reports invalid rows as skipped', async () => {
  const categoryId = '00000000-0000-0000-0000-000000000001';
  const partlyValid = { ...parsed, rows: [
    { email: 'ana@example.com', valid: true, rowNumber: 2, issues: [] },
    { email: null, valid: false, rowNumber: 3, issues: ['Email is invalid or missing'] },
  ], summary: { rowCount: 2, validCount: 1, invalidCount: 1, duplicateCount: 0 } };
  let contacts;
  const client = makeImportClient(categoryId, (value) => { contacts = value; });
  const route = load('app/api/admin/outreach/import/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({ client, user: { id: 'admin' } }) },
    '@/lib/outreach/import': { parseWorkbook: () => partlyValid, autoMapColumns: () => ({ Email: 'email' }) },
  });
  const response = await route.POST(importRequest({ commit: '1', categoryId }));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(contacts.length, 1);
  assert.deepEqual(body.skippedRows, [{ rowNumber: 3, issues: ['Email is invalid or missing'] }]);
});
```

- [ ] **Step 2: Run focused route tests to verify the test fails**

Run: `node --test tests/outreach-import.test.cjs`

Expected: FAIL because the route currently returns 422 for `parsed.summary.invalidCount > 0`.

- [ ] **Step 3: Filter invalid rows before persistence and return their details**

Replace the blanket invalid-row rejection in `app/api/admin/outreach/import/route.ts` with a valid-row selection:

```ts
const validRows = parsed.rows.filter((row) => row.valid && row.email);
const skippedRows = parsed.rows
  .filter((row) => !row.valid)
  .map(({ rowNumber, issues }) => ({ rowNumber, issues }));
if (!validRows.length) {
  return NextResponse.json({ error: 'No valid email rows found to import.', ...parsed, mapping: effectiveMapping, skippedRows }, { status: 422 });
}
```

Use `validRows` for `emails` and `contacts`. Keep `parsed.summary` for batch `row_count`, `duplicate_count`, and `invalid_count`; make the batch `imported_count` and success `importedCount` match `validRows.length`. Return `skippedCount` and `skippedRows` in the success JSON.

- [ ] **Step 4: Run route tests to verify green**

Run: `node --test tests/outreach-import.test.cjs`

Expected: PASS, with the new test demonstrating that bad rows do not reach the Supabase upsert payload.

- [ ] **Step 5: Commit partial-import behavior**

```bash
git add app/api/admin/outreach/import/route.ts tests/outreach-import.test.cjs
git commit -m "fix: skip invalid address book import rows"
```

### Task 3: Add the accessible CSV/XLSX drop zone and skip result

**Files:**
- Modify: `app/admin/outreach/import/ImportClient.tsx`
- Modify: `app/admin/outreach/Outreach.module.css`

- [ ] **Step 1: Add client result types and file acceptance helpers**

```ts
type SkippedRow = { rowNumber: number; issues: string[] };
type ImportResult = {
  error?: string; ok?: boolean; importedCount?: number; duplicateCount?: number;
  skippedCount?: number; skippedRows?: SkippedRow[]; message?: string;
};
const ACCEPTED_IMPORT_EXTENSIONS = ['.csv', '.xlsx'];
function isAcceptedImportFile(file: File): boolean {
  return ACCEPTED_IMPORT_EXTENSIONS.some((extension) => file.name.toLowerCase().endsWith(extension));
}
```

- [ ] **Step 2: Replace the source input with drag-and-drop interactions**

Use a visually-hidden `<input type="file" accept=".csv,.xlsx">` controlled by a ref. Wrap it in a `<div>` with `role="button"`, `tabIndex={0}`, click and Enter/Space handlers that open the picker, plus `onDragEnter`, `onDragOver`, `onDragLeave`, and `onDrop` handlers. The drop handler must call the same `selectFile(file)` function as picker changes; `selectFile` rejects wrong extensions with `Choose a .csv or .xlsx file.` and otherwise clears stale results.

```tsx
<div
  className={`${styles.dropzone} ${dragging ? styles.dropzoneActive : ''}`}
  role="button" tabIndex={0} aria-describedby="workbook-hint"
  onClick={() => inputRef.current?.click()}
  onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); inputRef.current?.click(); } }}
  onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
  onDragLeave={() => setDragging(false)}
  onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0] ?? null); }}
>
  <strong>Drop CSV or Excel file here</strong><span id="workbook-hint">or click to browse · .csv, .xlsx · 10 MB max</span>
</div>
```

- [ ] **Step 3: Render the skip summary after a successful import**

```tsx
{result?.ok && <div className={styles.success} role="status">
  <p>{result.message} {result.skippedCount ? `${result.skippedCount} invalid rows were skipped.` : ''}</p>
  {result.skippedRows?.length ? <ul className={styles.skipList}>
    {result.skippedRows.slice(0, 10).map((row) => <li key={row.rowNumber}>Row {row.rowNumber}: {row.issues.join(', ')}</li>)}
  </ul> : null}
</div>}
```

- [ ] **Step 4: Add focused drop-zone and skip-list styles**

```css
.dropzone { display:grid; place-items:center; gap:7px; min-height:132px; padding:20px; border:1.5px dashed #bda991; border-radius:12px; background:#fdf8f0; color:#57483c; text-align:center; cursor:pointer; }
.dropzone:hover, .dropzone:focus-visible, .dropzoneActive { border-color:#9b5a35; background:#f7ead8; outline:none; }
.dropzone span { color:#786e64; font-size:12px; }
.skipList { margin:8px 0 0; padding-left:18px; color:#715037; }
```

- [ ] **Step 5: Verify lint and all importer tests**

Run: `node --test tests/outreach-import.test.cjs && npm run lint`

Expected: PASS with no lint errors.

- [ ] **Step 6: Commit the import interface**

```bash
git add app/admin/outreach/import/ImportClient.tsx app/admin/outreach/Outreach.module.css
git commit -m "feat: add contact import drop zone"
```

### Task 4: Build and manually verify the admin workflow

**Files:**
- Modify: none

- [ ] **Step 1: Build the application**

Run: `npm run build`

Expected: successful Next.js production build without type errors.

- [ ] **Step 2: Manually exercise the import screen**

Run: `npm run dev`

Expected: on `/admin/outreach/import`, an admin can drop or select a CSV/XLSX file, select a category, import valid rows, and see skipped-row details. A file containing no valid email returns the no-valid-rows error and writes nothing.

- [ ] **Step 3: Review the final diff**

Run: `git diff HEAD~3..HEAD --check && git status --short`

Expected: no whitespace errors; only intentionally uncommitted user changes remain.

## Plan self-review

- Spec coverage: Tasks 1–2 cover CSV/XLSX parsing, header detection, per-row skip handling, no-valid-rows behavior, batch metrics, and audit-compatible imports. Task 3 covers drag/drop, picker fallback, keyboard access, visual feedback, and skip reporting. Task 4 covers type/build and workflow verification.
- Placeholder scan: no TODO/TBD/deferred implementation instructions.
- Type consistency: `skippedRows` is consistently `{ rowNumber, issues }[]`; API and UI use `skippedCount`.
