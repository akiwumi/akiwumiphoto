# Outreach Contact Categories Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let administrators manage reusable contact categories, choose one before a workbook import, reassign a contact later, and use categories in the address book, campaign audience, and delivery report.

**Architecture:** Categories are persisted in `outreach_contact_categories`; each persisted contact references at most one category with a nullable foreign key. Server loaders return a normalized category projection with each contact, API routes own category creation and reassignment, and pure filter helpers make category behavior consistent in the address book, campaign audience, and reporting UI.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase/Postgres, Node test runner, TypeScript transpile test loader.

---

## File structure

- Create `supabase/migrations/20260923100000_outreach_contact_categories.sql` — category table, contact foreign key/index, RLS, uniqueness validation.
- Create `lib/outreach/categories.ts` — shared category normalization, Uncategorised sentinel/display behavior, and reusable single/multi-category filters.
- Create `lib/outreach/categories-server.ts` — server-side category list query.
- Create `app/api/admin/outreach/categories/route.ts` — authenticated `GET` list and `POST` create-or-reuse endpoint.
- Create `app/api/admin/outreach/contacts/[id]/category/route.ts` — authenticated contact-category reassignment endpoint.
- Modify `types/outreach.ts` — expose optional category fields on Supabase contact records.
- Modify `lib/outreach/address-book.ts` — extend the address-book projection and compose address-book/campaign category filters.
- Modify `lib/outreach/address-book-server.ts` — join the category record and map it into address-book contacts.
- Modify `app/api/admin/outreach/import/route.ts` — require a valid category id and write it on every imported/upserted contact.
- Modify `app/admin/outreach/import/page.tsx` and `app/admin/outreach/import/ImportClient.tsx` — load categories, select/create one, and include it in the import form data.
- Modify `app/admin/outreach/contacts/page.tsx`, `app/admin/outreach/contacts/ContactsTable.tsx`, `app/admin/outreach/contacts/[id]/page.tsx`, and `app/admin/outreach/contacts/[id]/ContactDetailClient.tsx` — display/filter/reassign categories.
- Modify `app/admin/outreach/page.tsx` — surface category count and category in the recent-import preview.
- Modify `lib/outreach/delivery-report.ts` and `app/admin/outreach/report/DeliveryReportTable.tsx` — fetch, display, enumerate, and filter report categories.
- Modify `app/admin/outreach/campaigns/new/page.tsx` and `app/admin/outreach/campaigns/new/CampaignAudience.tsx` — provide category facets and apply country/category intersection filtering.
- Modify `tests/outreach-address-book.test.cjs`, `tests/outreach-import.test.cjs`, `tests/outreach-report.test.cjs`; create `tests/outreach-categories.test.cjs` — cover all pure behavior and API validation.

### Task 1: Add the database model and shared category primitives

**Files:**
- Create: `supabase/migrations/20260923100000_outreach_contact_categories.sql`
- Create: `lib/outreach/categories.ts`
- Modify: `types/outreach.ts`
- Test: `tests/outreach-categories.test.cjs`

- [ ] **Step 1: Write failing normalization and filtering tests**

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./test-loader.cjs');
const { categoryLabel, categoryKey, filterByCategories } = load('lib/outreach/categories.ts');

test('normalizes category names and exposes Uncategorised for nulls', () => {
  assert.equal(categoryKey('  Galleries  '), 'galleries');
  assert.equal(categoryLabel(null), 'Uncategorised');
  assert.equal(categoryLabel('  Design stores '), 'Design stores');
});

test('filters by selected categories and explicitly selects uncategorised contacts', () => {
  const rows = [{ id: '1', category: 'Galleries' }, { id: '2', category: null }, { id: '3', category: 'Design stores' }];
  assert.deepEqual(filterByCategories(rows, []).map((row) => row.id), ['1', '2', '3']);
  assert.deepEqual(filterByCategories(rows, ['Galleries', 'Uncategorised']).map((row) => row.id), ['1', '2']);
});
```

- [ ] **Step 2: Run the category test to verify it fails**

Run: `node --test tests/outreach-categories.test.cjs`

Expected: FAIL because `lib/outreach/categories.ts` does not exist.

- [ ] **Step 3: Add the migration**

Create a migration with the following SQL. Keep names/constraints exact so the API can rely on database enforcement.

```sql
create table if not exists public.outreach_contact_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists outreach_contact_categories_name_key
  on public.outreach_contact_categories (lower(btrim(name)));

alter table public.outreach_contacts
  add column if not exists category_id uuid references public.outreach_contact_categories(id) on delete set null;

create index if not exists outreach_contacts_category_idx
  on public.outreach_contacts (category_id, country, contact_status);

alter table public.outreach_contact_categories enable row level security;
drop policy if exists outreach_admin_all on public.outreach_contact_categories;
create policy outreach_admin_all on public.outreach_contact_categories
  for all using (public.outreach_is_admin()) with check (public.outreach_is_admin());
```

- [ ] **Step 4: Implement the pure category contract and TypeScript projection**

Create `lib/outreach/categories.ts` with these exports; the generic keeps the helper usable for contacts and report rows.

```ts
export const UNCATEGORISED_CATEGORY = 'Uncategorised';

export function categoryLabel(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : UNCATEGORISED_CATEGORY;
}

export function categoryKey(value: unknown): string {
  return categoryLabel(value).toLocaleLowerCase();
}

export function filterByCategories<T extends { category: unknown }>(rows: T[], selected: readonly string[]): T[] {
  if (selected.length === 0) return rows;
  const selectedKeys = new Set(selected.map(categoryKey));
  return rows.filter((row) => selectedKeys.has(categoryKey(row.category)));
}
```

Extend `OutreachContact` in `types/outreach.ts` with `category_id: string | null` and an optional joined `outreach_contact_categories: { id: string; name: string } | { id: string; name: string }[] | null` field. Do not make existing fields optional.

- [ ] **Step 5: Run focused tests and type checks**

Run: `node --test tests/outreach-categories.test.cjs && npm run build`

Expected: category tests PASS; build completes without a TypeScript error.

- [ ] **Step 6: Commit the schema and primitives**

```bash
git add supabase/migrations/20260923100000_outreach_contact_categories.sql lib/outreach/categories.ts types/outreach.ts tests/outreach-categories.test.cjs
git commit -m "feat: add outreach contact category model"
```

### Task 2: Add category APIs and enforce category assignment during imports

**Files:**
- Create: `lib/outreach/categories-server.ts`
- Create: `app/api/admin/outreach/categories/route.ts`
- Create: `app/api/admin/outreach/contacts/[id]/category/route.ts`
- Modify: `app/api/admin/outreach/import/route.ts`
- Test: `tests/outreach-categories.test.cjs`, `tests/outreach-import.test.cjs`

- [ ] **Step 1: Write failing API/import tests**

Add tests that mock `requireOutreachAdmin` and the Supabase chain. Assert all of the following:

```js
test('creates a trimmed category or returns the existing case-insensitive category', async () => {
  // POST { name: '  Galleries ' } writes 'Galleries'; a 23505 conflict is followed by
  // a lower-case lookup and returns the existing row with HTTP 200.
});

test('rejects import commits without a categoryId', async () => {
  // Construct a valid .xlsx FormData request with commit=1 and no categoryId.
  // Expect HTTP 422 and { error: 'Choose a contact category before importing.' }.
});

test('writes category_id for new and duplicate imported contacts', async () => {
  // Mock category lookup success and capture the outreach_contacts upsert payload.
  // Every object must have category_id: 'category-1'.
});

test('rejects contact category reassignment when categoryId is invalid', async () => {
  // PATCH /contacts/<uuid>/category with unknown categoryId returns 422.
});
```

- [ ] **Step 2: Run the focused tests to verify they fail**

Run: `node --test tests/outreach-categories.test.cjs tests/outreach-import.test.cjs`

Expected: FAIL because the routes and category validation do not yet exist.

- [ ] **Step 3: Add server loaders and authenticated category routes**

Implement `getOutreachCategories()` in `lib/outreach/categories-server.ts`. It must query `outreach_contact_categories` ordered by `name`, return `{ id, name }[]`, and return `[]` on query/configuration failure.

Implement `app/api/admin/outreach/categories/route.ts`:

```ts
export async function GET() {
  await requireOutreachAdmin();
  return NextResponse.json({ categories: await getOutreachCategories() });
}

export async function POST(request: Request) {
  // Parse JSON { name }, trim it, reject blank input with 422.
  // Insert { name: trimmedName }. On unique violation, query the matching
  // lower(btrim(name)) row and return it. Return { category } with 201 for a
  // new row and 200 for a reused row.
}
```

Implement `app/api/admin/outreach/contacts/[id]/category/route.ts` with `PATCH`: authorize, validate the route id and JSON `{ categoryId: string | null }`, ensure a non-null category exists, update only `category_id` on `outreach_contacts`, and return `{ contactId, categoryId }`. `null` deliberately clears a category; invalid/missing payload returns 422.

- [ ] **Step 4: Require a real category before a committed import**

In `app/api/admin/outreach/import/route.ts`, read `categoryId` from form data after deciding `shouldCommit`. Before inserting an import batch, reject a missing/blank id with:

```ts
return NextResponse.json({ error: 'Choose a contact category before importing.' }, { status: 422 });
```

Query `outreach_contact_categories` by that id; reject no match with `Choose a valid contact category before importing.` and status 422. Add `category_id: category.id` to every contact passed to `upsert`, and put `{ category_id: category.id, category_name: category.name }` in the import audit metadata. Keep preview-only parsing category-free.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `node --test tests/outreach-categories.test.cjs tests/outreach-import.test.cjs`

Expected: PASS.

- [ ] **Step 6: Commit the import and category APIs**

```bash
git add lib/outreach/categories-server.ts app/api/admin/outreach/categories/route.ts app/api/admin/outreach/contacts/[id]/category/route.ts app/api/admin/outreach/import/route.ts tests/outreach-categories.test.cjs tests/outreach-import.test.cjs
git commit -m "feat: assign categories during outreach imports"
```

### Task 3: Expose category selection in imports and the address book

**Files:**
- Modify: `lib/outreach/address-book.ts`
- Modify: `lib/outreach/address-book-server.ts`
- Modify: `app/admin/outreach/import/page.tsx`
- Modify: `app/admin/outreach/import/ImportClient.tsx`
- Modify: `app/admin/outreach/contacts/page.tsx`
- Modify: `app/admin/outreach/contacts/ContactsTable.tsx`
- Modify: `app/admin/outreach/contacts/[id]/page.tsx`
- Modify: `app/admin/outreach/contacts/[id]/ContactDetailClient.tsx`
- Modify: `app/admin/outreach/page.tsx`
- Test: `tests/outreach-address-book.test.cjs`, `tests/outreach-categories.test.cjs`

- [ ] **Step 1: Write failing address-book tests**

Add a test that `filterAddressBookContacts` accepts a fourth `category` argument, searches category text, and only returns rows matching both a selected country and category. Add a test that `campaignAudienceForFilters` returns the country/category intersection and treats no category selection as all categories.

```js
const rows = [
  { id: '1', country: 'Sweden', category: 'Galleries', name: 'A', studio: 'A', email: 'a@x.test' },
  { id: '2', country: 'Sweden', category: 'Design stores', name: 'B', studio: 'B', email: 'b@x.test' },
  { id: '3', country: 'Germany', category: null, name: 'C', studio: 'C', email: 'c@x.test' },
];
assert.deepEqual(campaignAudienceForFilters(rows, ['Sweden'], ['Galleries']).map((row) => row.id), ['1']);
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/outreach-address-book.test.cjs tests/outreach-categories.test.cjs`

Expected: FAIL because address-book contacts have no category and combined filters do not exist.

- [ ] **Step 3: Map category data into address-book contacts and pure helpers**

Add `categoryId: string | null` and `category: string | null` to `AddressBookContact`. Give each static fallback contact `null` for both fields.

Change `getAddressBook()` to select `category_id` and `outreach_contact_categories(id,name)`; safely unwrap the possible array join and map `categoryId`/`category`. Update `filterAddressBookContacts` to accept `category` and call `filterByCategories`; include `categoryLabel(contact.category)` in text search. Add `campaignAudienceForFilters(recipients, countries, categories)`, implemented by passing country-filtered rows through `filterByCategories`.

- [ ] **Step 4: Implement the import category control**

In the import page, call `getOutreachCategories()` and pass categories to `ImportClient` as `{ id, name }[]`.

In `ImportClient`, add `categoryId`, `newCategoryName`, and `creatingCategory` state. Render a required category `<select>` with existing categories and a `Create category` button/input. The create action POSTs `/api/admin/outreach/categories`, appends/replaces the returned category by id, and selects it. Add `form.set('categoryId', categoryId)` in `importWorkbook`; disable the import button unless file and category are present. Show API error text within the existing result notice.

- [ ] **Step 5: Implement address-book rendering, filtering, and reassignment**

Pass categories through `ContactsPage` and the contact detail page. In `ContactsTable`, derive category options from `categoryLabel(contact.category)`, add a category select next to country, pass it into `filterAddressBookContacts`, and add a Category column using `categoryLabel(contact.category)`.

In `ContactDetailClient`, render a Category select from the server-provided categories plus `Uncategorised`. On change, call `PATCH /api/admin/outreach/contacts/${id}/category` with `{ categoryId }`, update only `contact.categoryId` and `contact.category` after success, and surface a saving/failure message. Do not fold category into the existing local-storage detail override: category changes must persist to Supabase.

In the outreach overview, calculate distinct `categoryLabel(contact.category)` values and add category count to the address-book summary; render category in the preview table.

- [ ] **Step 6: Run address-book tests and build**

Run: `node --test tests/outreach-address-book.test.cjs tests/outreach-categories.test.cjs && npm run build`

Expected: PASS and successful production build.

- [ ] **Step 7: Commit the category UI**

```bash
git add lib/outreach/address-book.ts lib/outreach/address-book-server.ts app/admin/outreach/import/page.tsx app/admin/outreach/import/ImportClient.tsx app/admin/outreach/contacts/page.tsx app/admin/outreach/contacts/ContactsTable.tsx app/admin/outreach/contacts/[id]/page.tsx app/admin/outreach/contacts/[id]/ContactDetailClient.tsx app/admin/outreach/page.tsx tests/outreach-address-book.test.cjs tests/outreach-categories.test.cjs
git commit -m "feat: manage outreach categories in address book"
```

### Task 4: Add category facets to campaigns and delivery reporting

**Files:**
- Modify: `app/admin/outreach/campaigns/new/page.tsx`
- Modify: `app/admin/outreach/campaigns/new/CampaignAudience.tsx`
- Modify: `lib/outreach/delivery-report.ts`
- Modify: `app/admin/outreach/report/DeliveryReportTable.tsx`
- Test: `tests/outreach-address-book.test.cjs`, `tests/outreach-report.test.cjs`, `tests/outreach-provider.test.cjs`

- [ ] **Step 1: Write failing audience/report tests**

Add the campaign intersection test from Task 3 to `tests/outreach-address-book.test.cjs`. In `tests/outreach-report.test.cjs`, add:

```js
test('delivery report filters categories together with country and status', () => {
  const { filterDeliveryReportRows } = load('lib/outreach/delivery-report.ts');
  const rows = [
    { id: '1', country: 'Sweden', category: 'Galleries', status: 'opened', sentAt: '2026-09-20T12:00:00Z' },
    { id: '2', country: 'Sweden', category: 'Design stores', status: 'opened', sentAt: '2026-09-20T12:00:00Z' },
  ];
  assert.deepEqual(filterDeliveryReportRows(rows, { country: 'Sweden', category: 'Galleries', status: 'opened' }).map((row) => row.id), ['1']);
});
```

Update provider/report mock rows to include `outreach_contacts.category_id` and a joined `outreach_contact_categories` name, then assert mapped report rows expose `category`.

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --test tests/outreach-address-book.test.cjs tests/outreach-report.test.cjs tests/outreach-provider.test.cjs`

Expected: FAIL because campaign and report category filtering are not implemented.

- [ ] **Step 3: Add campaign category facets**

Pass `getOutreachCategories()` results from the new-campaign page into `CampaignAudience`. Add `selectedCategories` state, derive category labels with `categoryLabel`, and replace `campaignAudienceForCountries(contacts, selectedCountries)` with `campaignAudienceForFilters(contacts, selectedCountries, selectedCategories)`.

Render category checkboxes next to countries, including Uncategorised if at least one contact has no category. Add a `Show all categories` reset control and status count analogous to countries. Preserve country behavior, visible bulk selection, draft persistence, and sent-contact exclusion.

- [ ] **Step 4: Add report category data, display, and filtering**

Extend `DeliveryReportRow` with `category: string`. Add `deliveryReportCategories(rows)` using `categoryLabel`. In the delivery query, select `outreach_contacts(..., category_id, outreach_contact_categories(id,name))`, unwrap the nested relationship, and set `category` to the normalized category label. Change `filterDeliveryReportRows` to accept `category` in its filters and require a match only when it is non-empty.

In `DeliveryReportTable`, add category state, derive categories, add an `All categories` select, include `category` in the memoized filters, and show the category under the studio in recipient details (or as a dedicated Category column if the existing table remains legible). The refresh path must continue replacing rows without resetting user filters.

- [ ] **Step 5: Run focused tests to verify they pass**

Run: `node --test tests/outreach-address-book.test.cjs tests/outreach-report.test.cjs tests/outreach-provider.test.cjs`

Expected: PASS.

- [ ] **Step 6: Commit campaign and report facets**

```bash
git add app/admin/outreach/campaigns/new/page.tsx app/admin/outreach/campaigns/new/CampaignAudience.tsx lib/outreach/delivery-report.ts app/admin/outreach/report/DeliveryReportTable.tsx tests/outreach-address-book.test.cjs tests/outreach-report.test.cjs tests/outreach-provider.test.cjs
git commit -m "feat: filter outreach audiences and reports by category"
```

### Task 5: Run complete verification and review the migration rollout

**Files:**
- Modify only if verification identifies a scoped issue in a listed implementation/test file.
- Test: `tests/outreach-*.test.cjs`

- [ ] **Step 1: Run all outreach automated tests**

Run: `node --test tests/outreach-*.test.cjs`

Expected: all outreach tests PASS, including the new category API, import, audience, and report cases.

- [ ] **Step 2: Run lint and production build**

Run: `npm run lint && npm run build`

Expected: both commands exit 0.

- [ ] **Step 3: Manually verify the end-to-end admin flow**

Run the app and verify this sequence:

1. Open `/admin/outreach/import`; create `Galleries`; select it and import a valid workbook.
2. Confirm imported rows show `Galleries` in `/admin/outreach/contacts`.
3. Change one imported row to `Design stores` at `/admin/outreach/contacts/<id>`; reload and confirm persistence.
4. Open `/admin/outreach/campaigns/new`; select `Galleries` and a country, and confirm only their intersection is visible.
5. Open `/admin/outreach/report`; select `Galleries` and confirm recipient rows/filter count match the current contact category.

- [ ] **Step 4: Apply the migration to the configured Supabase project**

Run: `supabase db push`

Expected: migration `20260923100000_outreach_contact_categories.sql` applies successfully before category UI is used in production.

- [ ] **Step 5: Commit any verification-only corrections**

```bash
git status --short
git add <only-files-corrected-during-verification>
git commit -m "fix: complete outreach category verification"
```

Do not create this commit when verification makes no corrections.

## Self-review

- Spec coverage: Task 1 adds the reusable one-category model; Task 2 enforces assignment on import; Task 3 covers category reuse/creation, address-book display/filtering, and persistent reassignment; Task 4 covers campaign and delivery-report availability; Task 5 validates migration and the full user journey.
- No placeholders: every new route, helper, validation message, schema name, test command, and affected UI location is identified.
- Type consistency: `categoryId` is the persisted UUID, `category` is the nullable display name in contact projections, and `categoryLabel` produces the shared `Uncategorised` UI/filter value.
