# Campaign Recipient Country Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Filter new-campaign recipients by country while preserving the complete selected campaign audience.

**Architecture:** A pure outreach helper will filter contacts by country and identify the current filtered available audience. `CampaignAudience` will use that helper to derive the country dropdown, display rows, and scope bulk selection to the visible country while persisting the complete selection set.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Node.js built-in test runner.

---

## File structure

- `lib/outreach/address-book.ts` — hold the reusable country-filter helper alongside existing address-book filtering.
- `tests/outreach-address-book.test.cjs` — prove country-filter behavior, including preservation of off-filter selections.
- `app/admin/outreach/campaigns/new/CampaignAudience.tsx` — add country state, dropdown, visible-recipient filtering, and scoped bulk selection.

### Task 1: Add a testable campaign-recipient filter helper

**Files:**
- Modify: `lib/outreach/address-book.ts`
- Test: `tests/outreach-address-book.test.cjs`

- [ ] **Step 1: Write the failing regression test**

Append this test:

```js
test('filters campaign recipients by country without discarding selected IDs from other countries', () => {
  const { campaignAudienceForCountry } = load('lib/outreach/address-book.ts');
  const contacts = [
    { id: 'se', country: 'Sweden' },
    { id: 'de', country: 'Germany' },
    { id: 'fr', country: 'France' },
  ];
  assert.deepEqual(campaignAudienceForCountry(contacts, 'Germany').map((contact) => contact.id), ['de']);
  assert.deepEqual(campaignAudienceForCountry(contacts, '').map((contact) => contact.id), ['se', 'de', 'fr']);
});
```

- [ ] **Step 2: Run it and verify it fails**

Run: `node --test tests/outreach-address-book.test.cjs`

Expected: FAIL because `campaignAudienceForCountry` is not exported.

- [ ] **Step 3: Add the minimal pure helper**

Append this to `lib/outreach/address-book.ts`:

```ts
export function campaignAudienceForCountry<T extends Pick<AddressBookContact, 'country'>>(
  contacts: T[],
  country: string,
): T[] {
  return country ? contacts.filter((contact) => contact.country === country) : contacts;
}
```

- [ ] **Step 4: Run focused tests and commit**

Run: `node --test tests/outreach-address-book.test.cjs`

Expected: PASS.

```bash
git add lib/outreach/address-book.ts tests/outreach-address-book.test.cjs
git commit -m "test: cover campaign recipient country filtering"
```

### Task 2: Add country filtering to the campaign audience picker

**Files:**
- Modify: `app/admin/outreach/campaigns/new/CampaignAudience.tsx:3-60`

- [ ] **Step 1: Import the helper and add country state**

Replace the type-only address-book import and add filter state:

```tsx
import { campaignAudienceForCountry, type AddressBookContact } from '@/lib/outreach/address-book';

const [country, setCountry] = useState('');
```

- [ ] **Step 2: Derive country options and visible available contacts**

Replace the current `available` and `allAvailableSelected` assignments with:

```tsx
const available = contacts.filter((entry) => !sent[entry.id]);
const countries = [...new Set(contacts.map((entry) => entry.country))]
  .sort((left, right) => left.localeCompare(right));
const visibleContacts = campaignAudienceForCountry(contacts, country);
const visibleAvailable = visibleContacts.filter((entry) => !sent[entry.id]);
const selected = contacts.filter((entry) => selectedIds.includes(entry.id) && !sent[entry.id]);
const allAvailableSelected = visibleAvailable.length > 0
  && visibleAvailable.every((entry) => selectedIds.includes(entry.id));
```

- [ ] **Step 3: Scope bulk selection to the visible country**

Replace `toggleAllAvailable` with:

```tsx
function toggleAllAvailable() {
  const visibleIds = new Set(visibleAvailable.map((entry) => entry.id));
  setSelectedIds((current) => allAvailableSelected
    ? current.filter((id) => !visibleIds.has(id))
    : [...current.filter((id) => !visibleIds.has(id)), ...visibleAvailable.map((entry) => entry.id)]);
}
```

- [ ] **Step 4: Render the labelled country select and visible rows**

Place this before the recipient list:

```tsx
<div className={styles.bulkToolbar}>
  <label className={styles.filterField}>
    Country
    <select className={styles.select} aria-label="Filter campaign recipients by country" value={country} onChange={(event) => setCountry(event.target.value)}>
      <option value="">All countries</option>
      {countries.map((entry) => <option key={entry} value={entry}>{entry}</option>)}
    </select>
  </label>
  <span className={styles.bulkCount}>{visibleAvailable.length} available in this view</span>
</div>
```

Change the list mapping from `contacts.map(...)` to `visibleContacts.map(...)`. Keep the existing checkbox `checked` expression so selections from a different country remain in `selectedIds` until deliberately cleared.

- [ ] **Step 5: Verify and commit**

Run: `node --test tests/outreach-address-book.test.cjs && npm run build`

Expected: focused tests and production build PASS.

Manual check: open `/admin/outreach/campaigns/new`, select one country, click `Select all available`, switch to another country, and verify the selection count preserves the first country. Click `Deselect all` with the second country selected and verify it only removes IDs displayed in that country.

```bash
git add app/admin/outreach/campaigns/new/CampaignAudience.tsx
git commit -m "feat: filter campaign recipients by country"
```

### Task 3: Complete regression verification

**Files:**
- Verify only; no source changes expected.

- [ ] **Step 1: Run the full test suite**

Run: `node --test tests/*.test.cjs`

Expected: PASS, 44 tests or more with zero failures.

- [ ] **Step 2: Inspect the final state**

Run: `git diff --check HEAD~2..HEAD && git status --short`

Expected: no whitespace errors and no uncommitted files from this feature.
