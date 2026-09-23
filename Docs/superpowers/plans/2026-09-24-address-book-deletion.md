# Address-book deletion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permanently delete selected contacts or an entire category only after deliberate confirmation, while preserving contacts with recorded delivery history.

**Architecture:** Add an admin-only deletion API that resolves contact IDs server-side, blocks contacts referenced by deliveries, deletes only eligible rows, and records an audit event. Extend `ContactsTable` with selection state and a category-management panel that consumes the API; keep local manual contacts managed in browser storage.

**Tech Stack:** Next.js App Router, React, Supabase, Node test runner.

---

### Task 1: Add guarded deletion API and tests

**Files:**
- Create: `app/api/admin/outreach/contacts/delete/route.ts`
- Modify: `tests/outreach-import.test.cjs`

- [ ] **Step 1: Write failing API tests**

Cover `POST { contactIds }` and `POST { categoryId, categoryName }`: invalid/empty inputs return 422; contacts with `outreach_deliveries` are reported as protected; eligible contacts delete; category deletion requires exact name, deletes eligible category contacts, then category only when none remain; audit receives counts.

- [ ] **Step 2: Verify RED**

Run: `node --test tests/outreach-import.test.cjs`

Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement minimal guarded route**

Require `requireOutreachAdmin`, cap and de-duplicate IDs at 500, query deliveries for requested contacts, delete only IDs without deliveries, and return `{ deletedCount, protectedCount, protectedIds }`. For a category request, verify exact normalized name, use the same guard, delete the category only after all its contacts are gone, and write one audit record.

- [ ] **Step 4: Verify GREEN and commit**

Run: `node --test tests/outreach-import.test.cjs && npx tsc --noEmit`

Commit: `git add app/api/admin/outreach/contacts/delete/route.ts tests/outreach-import.test.cjs && git commit -m "feat: add guarded address book deletion"`

### Task 2: Add category deletion and contact bulk-selection UI

**Files:**
- Modify: `app/admin/outreach/contacts/ContactsTable.tsx`
- Modify: `app/admin/outreach/Outreach.module.css`

- [ ] **Step 1: Add selection and category management state**

Maintain `selectedIds`, `deleting`, and result message. Derive `visibleIds` from `filteredContacts`; select-all toggles only that list. Render category names with counts from current visible contact state.

- [ ] **Step 2: Implement confirmations and API calls**

For contacts, use a confirmation containing selected count, post `{ contactIds }`, remove deleted IDs from visible state, clear selection, and announce deleted/protected counts. For categories, require `window.prompt` exact category name after a count warning, post `{ categoryId, categoryName }`, and remove returned deleted contacts/category from state.

- [ ] **Step 3: Render accessible controls**

Add a checkbox table column, select-all-visible checkbox, disabled destructive bulk button, and category list with count/delete buttons. Use `role="alert"` for errors and `role="status"` for results. Label destructive actions with exact counts.

- [ ] **Step 4: Add styles and verify**

Add minimal category list and destructive-toolbar styling consistent with existing chips/buttons.

Run: `node --test tests/outreach-import.test.cjs && npx tsc --noEmit && npm run lint`

Commit: `git add app/admin/outreach/contacts/ContactsTable.tsx app/admin/outreach/Outreach.module.css && git commit -m "feat: add bulk address book deletion"`

### Task 3: Verify admin deletion end to end

**Files:** none

- [ ] **Step 1: Build and inspect**

Run: `npm run build`

Expected: production build succeeds.

- [ ] **Step 2: Manually verify**

On `/admin/outreach/contacts`, select filtered contacts and confirm deletion. Attempt a category delete with wrong text, then correct text. Verify protected contacts remain and counts are announced.
