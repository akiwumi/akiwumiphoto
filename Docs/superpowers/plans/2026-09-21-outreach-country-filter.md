# Outreach Country Preservation and Filtering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve imported outreach-contact country values and allow address-book filtering by country.

**Architecture:** A small pure helper in the address-book module will normalize only missing country values to `Unknown`; all non-empty imported country labels pass through unchanged. The server mapper will use that helper, and the client table will derive a sorted country option list from the rendered contacts before combining the selected country with its current text search.

**Tech Stack:** Next.js 16 App Router, React 19 client state, TypeScript, Node.js built-in test runner.

---

## File structure

- `lib/outreach/address-book.ts` — widen the country model and expose the pure country-preservation helper.
- `lib/outreach/address-book-server.ts` — map Supabase country values through the helper rather than coercing them to the Scandinavian sample set.
- `app/admin/outreach/contacts/ContactsTable.tsx` — maintain selected-country state, derive sorted options, and apply the dropdown filter with search.
- `app/admin/outreach/contacts/page.tsx` — remove static Scandinavian country chips that no longer describe imported data.
- `app/admin/outreach/Outreach.module.css` — keep the adjacent search and country controls responsive.
- `tests/outreach-address-book.test.cjs` — regression coverage for arbitrary imported country labels and missing data.

### Task 1: Preserve imported countries in the address-book mapper

**Files:**
- Modify: `lib/outreach/address-book.ts:3-18`
- Modify: `lib/outreach/address-book-server.ts:1-17`
- Test: `tests/outreach-address-book.test.cjs`

- [ ] **Step 1: Write the failing regression test**

Append this test to `tests/outreach-address-book.test.cjs`:

```js
test('preserves imported country labels and names missing countries Unknown', () => {
  const { addressBookCountry } = load('lib/outreach/address-book.ts');
  assert.equal(addressBookCountry('Germany'), 'Germany');
  assert.equal(addressBookCountry('United Kingdom'), 'United Kingdom');
  assert.equal(addressBookCountry('  France  '), 'France');
  assert.equal(addressBookCountry(null), 'Unknown');
  assert.equal(addressBookCountry('   '), 'Unknown');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/outreach-address-book.test.cjs`

Expected: FAIL because `addressBookCountry` is not exported.

- [ ] **Step 3: Implement the smallest country-preservation helper**

In `lib/outreach/address-book.ts`, make the model accept arbitrary country labels and add the helper immediately after the interface:

```ts
export interface AddressBookContact {
  id: string;
  country: string;
  studio: string;
  name: string;
  role: string;
  designerEmail: string | null;
  studioEmail: string;
  email: string;
  website: string;
  source: string;
  approvedForOutreach: boolean;
  outreachStatus: 'not contacted';
  replied: boolean;
  suppressed: boolean;
}

export function addressBookCountry(value: string | null | undefined): string {
  return value?.trim() || 'Unknown';
}
```

In `lib/outreach/address-book-server.ts`, replace the local `countryFor` function and its call:

```ts
import { ADDRESS_BOOK, addressBookCountry, type AddressBookContact } from './address-book';

// Delete countryFor.

// In the row mapper:
country: addressBookCountry(row.country),
```

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `node --test tests/outreach-address-book.test.cjs`

Expected: PASS, including the new arbitrary-country and blank-country assertions.

- [ ] **Step 5: Commit the mapped-country fix**

```bash
git add lib/outreach/address-book.ts lib/outreach/address-book-server.ts tests/outreach-address-book.test.cjs
git commit -m "fix: preserve imported outreach countries"
```

### Task 2: Add country dropdown filtering to the address book

**Files:**
- Modify: `app/admin/outreach/contacts/ContactsTable.tsx:10-69`
- Modify: `app/admin/outreach/contacts/page.tsx:8-9`
- Modify: `app/admin/outreach/Outreach.module.css:41-42`

- [ ] **Step 1: Add the selected-country state and derived options**

In `ContactsTable`, directly after `query` state, add:

```tsx
const [country, setCountry] = useState('');
const countries = [...new Set(visibleContacts.map((contact) => contact.country))]
  .sort((left, right) => left.localeCompare(right));
```

- [ ] **Step 2: Combine country selection with existing search filtering**

Replace the existing `filteredContacts` assignment with:

```tsx
const normalizedQuery = query.trim().toLowerCase();
const filteredContacts = visibleContacts.filter((contact) => {
  const matchesSearch = !normalizedQuery
    || [contact.name, contact.studio, contact.email, contact.country]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
  return matchesSearch && (!country || contact.country === country);
});
```

- [ ] **Step 3: Add an accessible dropdown to the toolbar**

Replace the opening toolbar content with this pair of controls before the count:

```tsx
<div className={styles.filterControls}>
  <input className={styles.input} placeholder="Search name, studio, email, or country" aria-label="Search address book" value={query} onChange={(event) => setQuery(event.target.value)} />
  <label className={styles.filterField}>
    Country
    <select className={styles.select} aria-label="Filter address book by country" value={country} onChange={(event) => setCountry(event.target.value)}>
      <option value="">All countries</option>
      {countries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
    </select>
  </label>
</div>
```

Add this CSS to `app/admin/outreach/Outreach.module.css` so the toolbar remains responsive:

```css
.filterControls { display:flex; align-items:flex-end; gap:10px; flex-wrap:wrap; }
.filterControls > .input { min-width:min(300px, 100%); }
```

- [ ] **Step 4: Use the same dynamic countries for manual entry**

Replace the three hard-coded manual-entry options in `ContactsTable.tsx` with:

```tsx
{countries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
```

Keep the existing initial form country value (`Sweden`). Because manually added
contacts are inserted into `visibleContacts`, their selected country is then
available as a filter option immediately.

- [ ] **Step 5: Remove static country chips from the server-rendered page header**

In `app/admin/outreach/contacts/page.tsx`, replace the panel heading with:

```tsx
<section className={styles.panel}>
  <div className={styles.panelHead}>
    <h2 className={styles.panelTitle}>{contacts.length} imported contacts</h2>
  </div>
  <ContactsTable contacts={contacts} />
</section>
```

This prevents the page from advertising a fixed Sweden/Denmark/Norway dataset while the client now presents actual imported countries.

- [ ] **Step 6: Verify the interaction and responsive layout**

Run: `npm run lint && npm run build`

Expected: both commands complete with exit code 0.

Then start `npm run dev`, sign in as an administrator, open `/admin/outreach/contacts`, select a non-Swedish country, and verify that the table and count show only that country. Enter a text search while the country is selected and verify both conditions apply. Select `All countries` and verify the full list returns.

- [ ] **Step 7: Commit the filter interface**

```bash
git add app/admin/outreach/contacts/ContactsTable.tsx app/admin/outreach/contacts/page.tsx app/admin/outreach/Outreach.module.css
git commit -m "feat: filter outreach contacts by country"
```

### Task 3: Run the regression suite

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Run all Node test files**

Run: `node --test tests/*.test.cjs`

Expected: PASS for every test file, including `outreach-address-book.test.cjs`.

- [ ] **Step 2: Inspect the final diff**

Run: `git diff --check HEAD~2..HEAD && git status --short`

Expected: no whitespace errors and no uncommitted source or test changes from this feature.
