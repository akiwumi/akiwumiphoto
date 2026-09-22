# First-party site analytics design

## Goal

Add a first-party, admin-only analytics dashboard that reports human visitor traffic and the site's complete visitor journey. Keep all event data in the existing Supabase project. Develop and review it in the `codex/site-analytics` branch before anything reaches the live site.

## Scope

Track these public-site actions after consent:

- Page views and unique anonymous visitors
- Gallery views and image/lightbox opens
- Contact-form submissions
- Print-shop product views, basket changes, checkout starts, payment outcomes, and purchase confirmations
- Print registration completions

The dashboard provides date filtering, headline metrics, daily traffic, top pages, referrer and device summaries, and conversion funnels from visits through each tracked action.

## Architecture

`SiteAnalytics` is a small client component mounted only for public routes. Once consent is present, it creates an opaque first-party session identifier and sends page-view and interaction events to `POST /api/analytics/event`.

The route handler validates a strict event schema, removes sensitive fields, normalizes paths, rejects admin/auth paths and obvious bots, rate-limits duplicate or excessive traffic, and writes accepted events to Supabase. Browser code never holds a service-role key.

Supabase stores raw, privacy-minimized events in `analytics_events`, with indexes for event time, type, path, and anonymous visitor identifier. Server-side data helpers aggregate events for the dashboard. Row-level security denies direct browser access; only an authenticated admin can read dashboard aggregates.

## Privacy and accuracy

- Tracking is disabled until analytics consent is granted.
- No names, emails, payment details, IP addresses, query strings, or full external referrer URLs are persisted.
- A randomly generated opaque visitor token identifies returning browsers; it is hashed before storage.
- Referrers are reduced to their origin hostname. Device information is stored only as a coarse class.
- Visitors can revoke consent, which stops subsequent collection. A dashboard disclosure describes that counts are estimates based on consented, bot-filtered browsers.
- The event endpoint deduplicates immediate repeated page views, excludes internal/admin routes, uses user-agent bot heuristics, and applies per-visitor/event throttling. This improves human-traffic estimates without claiming perfect bot detection.

## Dashboard

Add `/admin/dashboard/analytics`, protected by the existing `isAdmin` check and visually consistent with the current admin shell. Its initial view is the last 30 days and includes:

- Unique visitors, sessions, page views, contact submissions, checkout starts, completed payments, and registrations
- Day-by-day visitor and page-view chart
- Top pages, referring domains, and device classes
- Funnel cards: visit → gallery interaction → checkout → paid order, and visit → registration completion
- A date-range selector with common ranges and a custom bounded range

For branch preview, a development-only seed route or fixture data renders clearly labelled demo analytics when the database has no event records. It must never be reachable in production or mix sample data with real reporting.

## Failure handling

Analytics must never block navigation, purchases, registration, or form submission. Client delivery is best-effort and silent on failure. The server rejects invalid data with a non-sensitive response and logs only operational diagnostics. The dashboard presents a safe empty state when no events exist.

## Testing

- Unit tests for schema validation, sanitization, deduplication, bot exclusion, and aggregate calculations
- Route tests for authorization, invalid payload rejection, and valid event persistence
- Component tests or manual browser checks for page tracking and each interaction event
- Build/lint verification, with the production build checked to ensure demo-seeding code is excluded

## Deployment boundary

This implementation remains in `codex/site-analytics` until the user reviews the preview and explicitly asks to merge/deploy it. The preview is allowed to write only to the configured non-production environment or use demo data; it must not silently collect production visitor analytics.
