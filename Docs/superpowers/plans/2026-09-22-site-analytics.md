# First-party Site Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add consent-gated, first-party visitor and conversion analytics stored in Supabase, with a protected admin dashboard and preview-only demo data.

**Architecture:** A browser tracker creates an opaque local session token and sends a strict event payload to `POST /api/analytics/event`. The route sanitizes and rate-limits events before inserting them into `analytics_events`; server-side aggregation helpers feed `/admin/dashboard/analytics`. Existing cookie consent gates the tracker, and existing admin auth protects reporting.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Supabase SSR/client, Supabase SQL migration/RLS, CSS modules, Node's built-in test runner.

---

## File map

- Create `supabase/migrations/<timestamp>_analytics_events.sql`: table, indexes, RLS, and aggregate RPC/query support.
- Create `lib/analytics.ts`: event names, payload types, sanitization, session hashing, and aggregate types.
- Create `app/api/analytics/event/route.ts`: consent-gated event ingestion with validation, bot filtering, and throttling.
- Modify `components/SiteAnalytics.tsx`: replace Vercel tracking with first-party page-view and interaction tracking helpers.
- Create `components/AnalyticsTracker.tsx`: client hook/context for interaction events that public components can call without blocking UX.
- Modify `components/CookieConsentProvider.tsx` and `app/cookie-policy/page.tsx`: describe first-party analytics consistently with existing consent controls.
- Create `lib/analytics-dashboard.ts`: authenticated server-side Supabase queries and demo fallback.
- Create `app/admin/dashboard/analytics/page.tsx` and `app/admin/dashboard/analytics/AnalyticsDashboard.tsx`: protected dashboard route and UI.
- Modify `app/admin/dashboard/AdminSidebar.tsx` and `app/admin/dashboard/AdminShell.tsx`: expose the analytics navigation item and active state.
- Modify public interaction owners (`app/gallery/[slug]/GalleryPageClient.tsx`, `app/contact/*`, `app/basket/*`, checkout/payment routes, and registration success paths): emit named events through the tracker.
- Create `scripts/seed-analytics-demo.mjs` or a fixture module guarded by `NODE_ENV !== 'production'`: generate labelled preview data without a production path.
- Create `lib/analytics.test.ts` and `app/api/analytics/event/route.test.ts`: deterministic unit/route coverage using Node's built-in test runner.

### Task 1: Define the Supabase event store

**Files:**
- Create: `supabase/migrations/20260922120000_analytics_events.sql`

- [ ] **Step 1: Write the migration with constrained fields and RLS**

Create `analytics_events` with UUID id, event type, event timestamp, hashed visitor token, session token, normalized path, referrer origin, device class, country, JSON metadata, and a deduplication key. Add indexes on `(occurred_at)`, `(event_name, occurred_at)`, `(visitor_hash, occurred_at)`, and `(path, occurred_at)`. Enable RLS with no direct public policies; expose only a server-side service-role path or an admin-only SQL function.

- [ ] **Step 2: Add retention and aggregate query support**

Add a `get_analytics_summary(start_at timestamptz, end_at timestamptz)` security-definer function that returns headline counts, daily counts, top pages, referrers, devices, and event funnel counts. Restrict the function to authenticated admins by checking `auth.jwt() -> 'app_metadata' ->> 'role' = 'admin'`. Clamp date ranges to 366 days.

- [ ] **Step 3: Apply/check the migration**

Run the repository's established Supabase migration verification command, then inspect the generated SQL for `SECURITY DEFINER`, `search_path`, and RLS correctness. Expected result: migration parses and no anonymous policy can read or insert rows.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260922120000_analytics_events.sql
git commit -m "feat: add first-party analytics event store"
```

### Task 2: Build validated event ingestion and tracker primitives

**Files:**
- Create: `lib/analytics.ts`
- Create: `app/api/analytics/event/route.ts`
- Create: `components/AnalyticsTracker.tsx`
- Modify: `components/SiteAnalytics.tsx`

- [ ] **Step 1: Write failing tests for event normalization**

Cover: accepted event names; rejection of unknown names, oversized paths, query strings, emails, and malformed metadata; origin-only referrer normalization; coarse device normalization; deterministic hashing; and duplicate-key generation.

- [ ] **Step 2: Run the focused tests and confirm failure**

Run `node --test lib/analytics.test.ts`. Expected: FAIL because the exported normalization functions do not exist.

- [ ] **Step 3: Implement the shared analytics contract**

Define the complete event union: `page_view`, `gallery_view`, `image_open`, `contact_submit`, `product_view`, `basket_add`, `basket_remove`, `checkout_start`, `payment_success`, `payment_failure`, and `registration_complete`. Sanitize all metadata to a small allowlist of IDs/slugs and never accept identity, payment, or query-string values.

- [ ] **Step 4: Implement the API route**

Require `POST`, parse JSON with a bounded body, reject missing consent header/body flag, reject admin/auth paths, apply user-agent bot checks and an in-memory per-process throttle, hash the opaque visitor token with a server secret, and insert with the Supabase service client. Return `{ ok: true }` for accepted and safely ignored events so tracking failures never interrupt navigation.

- [ ] **Step 5: Implement the client tracker**

Create a provider/hook that only activates when `useCookieConsent().status === 'accepted'`, stores a random opaque browser token in local storage, sends page views once per pathname, and exposes `trackAnalyticsEvent(name, metadata)`. Use `navigator.sendBeacon` when available and `fetch(..., { keepalive: true })` otherwise; swallow network errors.

- [ ] **Step 6: Replace Vercel tracking**

Update `SiteAnalytics.tsx` to render the first-party tracker and remove the `@vercel/analytics/next` import. Remove `@vercel/analytics` from `package.json` only after `npm install` updates the lockfile cleanly.

- [ ] **Step 7: Run focused tests and commit**

Run `node --test lib/analytics.test.ts app/api/analytics/event/route.test.ts` and expect PASS. Commit the tracker and endpoint with `git add` and message `feat: collect consented first-party analytics`.

### Task 3: Instrument all requested visitor actions

**Files:**
- Modify: `app/gallery/[slug]/GalleryPageClient.tsx`
- Modify: contact form client/route files under `app/contact/`
- Modify: `app/prints/page.tsx`, `app/basket/BasketClient.tsx`, `app/basket/paid/ClearBasket.tsx`
- Modify: checkout/payment API routes and registration success client/server paths

- [ ] **Step 1: Add gallery events**

Track one `gallery_view` per gallery slug and one `image_open` per image ID per session, with only slug/ID metadata.

- [ ] **Step 2: Add contact events**

Track `contact_submit` only after the existing server action/API confirms success; never send form contents or email addresses.

- [ ] **Step 3: Add shop funnel events**

Track `product_view`, `basket_add`, `basket_remove`, and `checkout_start` at the corresponding successful UI transitions. Track `payment_success` only from the verified payment success path and `payment_failure` only with a coarse failure category.

- [ ] **Step 4: Add registration completion**

Track `registration_complete` after the existing registration confirmation succeeds, with no collector identity metadata.

- [ ] **Step 5: Verify non-blocking behavior**

Use browser checks to confirm an analytics request failure does not prevent gallery interaction, contact submission, basket updates, checkout, payment success, or registration completion. Commit as `feat: instrument site conversion events`.

### Task 4: Add server dashboard data and protected UI

**Files:**
- Create: `lib/analytics-dashboard.ts`
- Create: `app/admin/dashboard/analytics/page.tsx`
- Create: `app/admin/dashboard/analytics/AnalyticsDashboard.tsx`
- Create: `app/admin/dashboard/analytics/AnalyticsDashboard.module.css`
- Modify: `app/admin/dashboard/AdminSidebar.tsx`
- Modify: `app/admin/dashboard/AdminShell.tsx`

- [ ] **Step 1: Add authenticated query helper**

Use `createServerClient()` and `isAdmin()` before querying the aggregate function. Return a typed empty state if Supabase is unavailable in local preview. Support `7`, `30`, `90`, and custom date ranges while clamping all ranges server-side.

- [ ] **Step 2: Build the dashboard view**

Render headline cards for unique visitors, sessions, page views, contact submissions, checkout starts, completed payments, and registrations; a daily traffic table/chart; top pages/referrers/devices; and the two requested funnels. Include loading/empty/error states and a visible “Demo data” label when fixture data is used.

- [ ] **Step 3: Add admin navigation**

Add an Analytics item to the existing dashboard sidebar and mark `/admin/dashboard/analytics` active without changing existing section behavior.

- [ ] **Step 4: Verify authorization and responsive layout**

Check anonymous users redirect to `/admin`, admin users can open the page, and narrow viewport layout remains readable. Commit as `feat: add admin analytics dashboard`.

### Task 5: Add isolated preview fixtures and privacy copy

**Files:**
- Create: `lib/analytics-demo.ts`
- Modify: `lib/analytics-dashboard.ts`
- Modify: `components/CookieConsentProvider.tsx`
- Modify: `app/cookie-policy/page.tsx`

- [ ] **Step 1: Create deterministic demo aggregates**

Generate a fixed 30-day dataset in memory with clearly labelled demo values for every metric and event type. Enable it only when `NODE_ENV !== 'production'` and the database has no analytics rows; never insert it into Supabase.

- [ ] **Step 2: Update consent language**

Replace Vercel-specific copy with first-party Supabase-backed analytics wording, explain anonymous session identifiers and tracked action categories, and keep the existing accept/reject/settings behavior unchanged.

- [ ] **Step 3: Test the production guard**

Run a production-mode dashboard check and assert demo data cannot be selected. Commit as `feat: add analytics preview fixtures and privacy copy`.

### Task 6: Full verification and preview handoff

**Files:**
- Modify only files needed to resolve verification failures.

- [ ] **Step 1: Run lint and tests**

Run `npm run lint` and `node --test lib/analytics.test.ts app/api/analytics/event/route.test.ts`. Expected: no lint errors and all analytics tests pass.

- [ ] **Step 2: Run a production build**

Run `npm run build`. Expected: successful Next.js build with no demo-data production path errors.

- [ ] **Step 3: Run manual preview checks**

Open the branch preview, accept analytics consent, browse pages, open a gallery image, submit a test contact form, add/remove a test basket item, and inspect `/admin/dashboard/analytics`. Confirm metrics update only after consent and admin routes remain excluded.

- [ ] **Step 4: Review branch status**

Run `git diff --check` and `git status --short`; ensure only intentional analytics files are present. Leave the branch unmerged for user review.

