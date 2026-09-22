# Delivery Report Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add country filtering and safe individual/bulk erasure to the delivery report.

**Architecture:** Keep report filtering and country-option derivation in pure helpers so the client behavior is testable. Add an admin-only `DELETE /api/admin/outreach/report` route that validates a bounded unique ID list and deletes only those delivery rows; the existing foreign-key cascade removes their events. The client manages visible rows and selection state locally, confirmation, and refresh-like removal after successful API responses.

**Tech Stack:** Next.js 16 App Router, React 19 client state, Supabase service client, Node.js built-in test runner.

---

## File structure

- `lib/outreach/delivery-report.ts` — add pure country/filter helpers shared by the report UI and tests.
- `app/api/admin/outreach/report/route.ts` — admin-authorized bounded delivery deletion endpoint.
- `app/admin/outreach/report/DeliveryReportTable.tsx` — country dropdown, row selection, select-all-visible, individual erase, bulk erase, confirmation, and local state updates.
- `tests/outreach-provider.test.cjs` — pure delivery-report filter regression coverage.
- `tests/outreach-report.test.cjs` — deletion route validation, authorization, success, and database-failure coverage.

The existing `outreach_events.delivery_id on delete cascade` constraint in
`supabase/migrations/20260920120000_outreach_dashboard.sql` supplies event
cleanup; no migration is required.

### Task 1: Add tested report filtering helpers

**Files:**
- Modify: `lib/outreach/delivery-report.ts`
- Test: `tests/outreach-provider.test.cjs`

- [ ] **Step 1: Write failing tests**

Append:

```js
test('delivery report helpers derive countries and combine country/status filters', () => {
  const { deliveryReportCountries, filterDeliveryReportRows } = load('lib/outreach/delivery-report.ts');
  const rows = [
    { id: '1', email: 'a@example.com', country: 'Sweden', status: 'delivered', sentAt: '2026-09-20T10:00:00Z' },
    { id: '2', email: 'b@example.com', country: 'Germany', status: 'bounced', sentAt: '2026-09-21T10:00:00Z' },
    { id: '3', email: 'c@example.com', country: 'Germany', status: 'delivered', sentAt: '2026-09-22T10:00:00Z' },
  ];
  assert.deepEqual(deliveryReportCountries(rows), ['Germany', 'Sweden']);
  assert.deepEqual(filterDeliveryReportRows(rows, { country: 'Germany', status: 'delivered' }).map((row) => row.id), ['3']);
  assert.deepEqual(filterDeliveryReportRows(rows, { country: '', status: 'all' }).map((row) => row.id), ['1', '2', '3']);
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `node --test tests/outreach-provider.test.cjs`

Expected: FAIL because the helper exports do not exist.

- [ ] **Step 3: Implement pure helpers**

Add to `lib/outreach/delivery-report.ts`:

```ts
export function deliveryReportCountries(rows: Array<Pick<DeliveryReportRow, 'country'>>): string[] {
  return [...new Set(rows.map((row) => row.country?.trim() || 'Unknown'))]
    .sort((left, right) => left.localeCompare(right));
}

export function filterDeliveryReportRows<T extends Pick<DeliveryReportRow, 'country' | 'status' | 'sentAt'>>(
  rows: T[],
  filters: { country: string; status: string; from?: string; to?: string },
): T[] {
  const after = filters.from ? new Date(`${filters.from}T00:00:00`).getTime() : -Infinity;
  const before = filters.to ? new Date(`${filters.to}T23:59:59.999`).getTime() : Infinity;
  return rows.filter((row) => {
    const sent = row.sentAt ? new Date(row.sentAt).getTime() : 0;
    return sent >= after && sent <= before
      && (!filters.country || (row.country?.trim() || 'Unknown') === filters.country)
      && (filters.status === 'all' || row.status === filters.status);
  });
}
```

Add `country: string` to `DeliveryReportRow`, mapping `contact?.country?.trim() || 'Unknown'` in `getDeliveryReport` and selecting `country` from `outreach_contacts`.

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test tests/outreach-provider.test.cjs`

Expected: PASS.

```bash
git add lib/outreach/delivery-report.ts tests/outreach-provider.test.cjs
git commit -m "test: cover delivery report country filtering"
```

### Task 2: Add the admin deletion endpoint

**Files:**
- Create: `app/api/admin/outreach/report/route.ts`
- Create: `tests/outreach-report.test.cjs`

- [ ] **Step 1: Write failing route tests**

Create tests with the project loader and mocked modules:

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-loader.cjs');

function request(body) {
  return new Request('https://example.com/api/admin/outreach/report', {
    method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
}

test('rejects an empty or oversized delivery deletion list', async () => {
  const route = load('app/api/admin/outreach/report/route.ts', { '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) } });
  assert.equal((await route.DELETE(request({ ids: [] }))).status, 422);
  assert.equal((await route.DELETE(request({ ids: Array.from({ length: 201 }, (_, i) => `id-${i}`) }))).status, 422);
});

test('deletes only unique requested deliveries after admin authorization', async () => {
  let deleted;
  const route = load('app/api/admin/outreach/report/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => ({ from: (table) => { assert.equal(table, 'outreach_deliveries'); return { delete: () => ({ in: async (column, ids) => { deleted = { column, ids }; return { error: null }; } }) }; } }) },
  });
  const response = await route.DELETE(request({ ids: ['delivery-1', 'delivery-1', 'delivery-2'] }));
  assert.equal(response.status, 200);
  assert.deepEqual(deleted, { column: 'id', ids: ['delivery-1', 'delivery-2'] });
});

test('returns an error without deleting when the database rejects the request', async () => {
  const route = load('app/api/admin/outreach/report/route.ts', {
    '@/lib/outreach/auth': { requireOutreachAdmin: async () => ({}) },
    '@/lib/stripe': { serviceClient: () => ({ from: () => ({ delete: () => ({ in: async () => ({ error: { message: 'database unavailable' } }) }) }) }) },
  });
  const response = await route.DELETE(request({ ids: ['delivery-1'] }));
  assert.equal(response.status, 500);
  assert.match((await response.json()).error, /database unavailable/i);
});

test('returns 403 when outreach admin authorization fails', async () => {
  const route = load('app/api/admin/outreach/report/route.ts', { '@/lib/outreach/auth': { requireOutreachAdmin: async () => { throw new Error('OUTREACH_UNAUTHORIZED'); } } });
  assert.equal((await route.DELETE(request({ ids: ['delivery-1'] }))).status, 403);
});
```

- [ ] **Step 2: Run the route tests and verify they fail**

Run: `node --test tests/outreach-report.test.cjs`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the bounded admin-only DELETE route**

Create `app/api/admin/outreach/report/route.ts`:

```ts
import { NextResponse } from 'next/server';
import { requireOutreachAdmin } from '@/lib/outreach/auth';
import { serviceClient } from '@/lib/stripe';

const MAX_IDS = 200;

export async function DELETE(request: Request) {
  try {
    await requireOutreachAdmin();
  } catch (error) {
    if (error instanceof Error && error.message === 'OUTREACH_UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    return NextResponse.json({ error: 'Unable to authorize report deletion.' }, { status: 500 });
  }
  const body = await request.json().catch(() => null) as { ids?: unknown } | null;
  const ids = Array.isArray(body?.ids) ? [...new Set(body.ids.filter((id): id is string => typeof id === 'string' && id.trim()).map((id) => id.trim()))] : [];
  if (ids.length === 0 || ids.length > MAX_IDS) return NextResponse.json({ error: `Choose between 1 and ${MAX_IDS} delivery records.` }, { status: 422 });
  const { error } = await serviceClient().from('outreach_deliveries').delete().in('id', ids);
  if (error) return NextResponse.json({ error: error.message || 'Unable to erase delivery records.' }, { status: 500 });
  return NextResponse.json({ ok: true, deletedCount: ids.length });
}
```

- [ ] **Step 4: Run route tests and commit**

Run: `node --test tests/outreach-report.test.cjs`

Expected: PASS.

```bash
git add app/api/admin/outreach/report/route.ts tests/outreach-report.test.cjs
git commit -m "feat: add admin delivery report deletion"
```

### Task 3: Add country filter and row/bulk erasure UI

**Files:**
- Modify: `app/admin/outreach/report/DeliveryReportTable.tsx`

- [ ] **Step 1: Add state and filtered-row derivation**

Import `deliveryReportCountries`, `filterDeliveryReportRows`, and `useEffect`; add `reportRows`, `country`, `selectedIds`, `message`, and `deleting` state. Derive filtered rows through the helper, then apply the existing newest/oldest sort to that filtered array. Country options must come from `reportRows` and include `All countries`.

- [ ] **Step 2: Add selection helpers and visible-scope actions**

Use a `Set` for selected IDs. The header checkbox selects/deselects only `filtered` rows. Individual row checkboxes toggle one ID. `eraseSelected` sends only selected IDs that are currently visible; `eraseOne` sends one row ID. Both confirm with the record count, disable controls while deleting, remove successfully deleted IDs from `reportRows` and `selectedIds`, and show the API error without changing rows on failure.

- [ ] **Step 3: Render controls and actions accessibly**

Add the country select to the existing filter toolbar. Add a labelled select-all-visible checkbox in the table header, a checkbox column, an `Erase` button per row, and an `Erase selected` toolbar button that is disabled when no visible rows are selected. Keep provider IDs and existing status presentation unchanged.

- [ ] **Step 4: Verify the full interface**

Run:

```bash
node --test tests/outreach-provider.test.cjs tests/outreach-report.test.cjs
npx tsc --noEmit
npm run build
```

Expected: all focused tests pass, TypeScript passes, and the production build completes. Manually verify country filtering, individual erase, select-all-visible, bulk erase confirmation, and that changing country does not silently erase hidden selections.

- [ ] **Step 5: Commit the UI**

```bash
git add app/admin/outreach/report/DeliveryReportTable.tsx lib/outreach/delivery-report.ts
git commit -m "feat: manage delivery reports by country and selection"
```

### Task 4: Full regression verification

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Run all tests and diff checks**

Run: `node --test tests/*.test.cjs && git diff --check HEAD~3..HEAD && git status --short`

Expected: all tests pass, no whitespace errors, and no uncommitted feature files.
