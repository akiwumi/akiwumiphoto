# Interior Designer Outreach Dashboard — Design

## Goal

Build a private, admin-only outreach dashboard inside the existing Akiwumi Photo Next.js/Supabase application. Eugene can import contacts from `.xlsx`, review and approve them, create personalised campaigns, preview messages, queue sends through a safe provider adapter, receive delivery events, and manage replies, follow-ups, suppression, and audit history.

The first local build uses a mock provider by default. It must never send external email unless a real provider is explicitly configured and a campaign is explicitly authorised.

## Scope and sequence

Implementation follows the source specification in this order:

1. Read the current Next.js documentation and inspect existing admin patterns.
2. Add the Supabase migration and shared types.
3. Add secure admin data-access functions.
4. Add Excel parsing, validation, deduplication, and import preview.
5. Add contact review and filtering UI.
6. Add campaign creation and merge-field preview.
7. Add provider adapter and safe send-test flow.
8. Add queued processing with configurable rate limiting.
9. Add signed webhook handling and idempotent event storage.
10. Add manual reply, status, notes, and follow-up workflow.
11. Add unsubscribe and suppression handling.
12. Add tests and complete local email-client-oriented QA where possible.

Out of scope remains automatic inbox access or classification, automatic follow-up email, public campaign building, CRM/social integrations, and live sending without explicit configuration and approval.

## Architecture

### Existing application boundaries

- Next.js App Router pages and route handlers.
- Existing `/admin` authentication and `isAdmin` authorization pattern.
- Supabase server client for authenticated reads/writes.
- Supabase migrations for database schema and RLS.
- Existing admin shell and sidebar as the visual/navigation foundation.

### Outreach boundaries

- `lib/outreach/contacts.ts`: normalized contact queries, filters, approvals, suppression, and manual status updates.
- `lib/outreach/import.ts`: workbook parsing, column mapping, validation, duplicate detection, and import summaries.
- `lib/outreach/render.ts`: allowlisted merge fields, HTML escaping, plain-text rendering, unresolved-tag checks, and URL safety warnings.
- `lib/outreach/campaigns.ts`: campaign creation, audience resolution, preview data, and recipient eligibility.
- `lib/outreach/queue.ts`: delivery creation, rate-limited processing, pause/resume/cancel state checks, and provider result persistence.
- `lib/outreach/audit.ts`: append-only audit records for important admin actions.
- `lib/outreach/providers/types.ts`: provider interface and normalized webhook event types.
- `lib/outreach/providers/mock.ts`: local provider that records deterministic message IDs and supports test/webhook simulation without network delivery.
- `lib/outreach/providers/index.ts`: environment-selected provider factory; real providers can be added without changing campaign logic.

Provider credentials, webhook secrets, and send operations remain server-only. Browser clients receive rendered previews and sanitized status data only.

## Data model

Add Supabase tables matching the source specification:

- `outreach_contacts`
- `outreach_import_batches`
- `outreach_campaigns`
- `outreach_deliveries`
- `outreach_events`
- `outreach_contact_notes`
- `outreach_audit_log`

Use constrained status values, normalized unique email addresses, a unique `(campaign_id, contact_id)` delivery constraint, and an optional unique provider event ID for webhook idempotency. RLS must keep all outreach data admin-only. Every mutation records the authenticated admin where the schema permits it and writes an audit entry for campaign creation, approval, queue, pause, resume, cancel, suppression, and status changes.

## User experience

The outreach area extends the current admin shell with a focused operations workspace:

- `/admin/outreach`: overview of contacts, active campaigns, queued deliveries, replies, and recent activity.
- `/admin/outreach/import`: upload `.xlsx`, map columns, preview 20 rows, see validation/conflict counts, and confirm import.
- `/admin/outreach/contacts`: dense review table with filters for batch, geography, approval, outreach state, replied, suppressed, and bounced.
- `/admin/outreach/contacts/[id]`: contact details, notes, manual reply/follow-up controls, suppression action, and reverse-chronological delivery history.
- `/admin/outreach/campaigns`: campaign list and status summaries.
- `/admin/outreach/campaigns/new`: campaign fields, audience selection, template editing from the existing HTML mailer, and safe merge-field guidance.
- `/admin/outreach/campaigns/[id]/preview`: desktop/mobile preview, selected-contact rendering, plain-text preview, recipient count, URL warnings, and send-test action.

Visual direction: editorial operations desk — warm off-white surfaces, ink typography, restrained ochre/terracotta accents, precise table density, and clear state chips. Reuse existing admin spacing and shell behavior so the feature feels native to Akiwumi Photo rather than a separate SaaS product.

## Import and personalization safety

- Accept only `.xlsx` files within configured size and row limits.
- Read the first worksheet by default.
- Treat cell values as untrusted data.
- Normalize Unicode whitespace and email case.
- Validate email syntax server-side.
- Detect workbook duplicates and existing-contact conflicts without silently overwriting data.
- Require explicit approval before a contact becomes campaign-eligible.
- Render only `first_name`, `company_name`, `city`, `website`, and `unsubscribe_url` merge fields.
- HTML-escape values and plain-text escape text output.
- Render missing first names as `Hello,` and never send unresolved merge tags.
- Warn on signed URLs, localhost, `file://`, relative image paths, or other temporary/local image references.

## Sending and webhook behavior

Campaign sends create `queued` deliveries, render per-contact content, call the selected provider, store the provider message ID, and update to `submitted` or `sent`. Processing is rate-limited and state-aware. Pause, resume, and cancel affect queued deliveries only; submitted deliveries cannot be recalled.

The mock provider returns deterministic IDs and records calls locally. A real provider adapter must implement multipart HTML/plain-text sending with `Reply-To`, signature verification, normalized delivery events, and unsubscribe-compatible headers. Webhook events are verified server-side, deduplicated by provider event ID, and cannot move a delivery backward.

## Routes and security

Pages use the existing server-side `isAdmin` check. Mutating route handlers repeat authorization and validate request payloads. Suggested endpoints:

- `POST /api/admin/outreach/import`
- `POST /api/admin/outreach/campaigns/[id]/send-test`
- `POST /api/admin/outreach/campaigns/[id]/queue`
- `POST /api/admin/outreach/campaigns/[id]/pause`
- `POST /api/admin/outreach/campaigns/[id]/resume`
- `POST /api/admin/outreach/campaigns/[id]/cancel`
- `POST /api/admin/outreach/webhooks/[provider]`

Webhook routes do not require an admin browser session but must verify the provider signature. Credentials and private notes are never sent to the browser or logged unnecessarily. Import, send, and webhook operations receive basic rate limiting appropriate to the local deployment.

## Verification

Unit tests cover normalization, email validation, column mapping, duplicate detection, HTML escaping, plain-text rendering, suppression filtering, status transitions, signature verification, and webhook idempotency. Integration tests cover import preview/confirmation, duplicate imports, campaign creation, approval gating, suppression/bounce exclusion, queueing, provider IDs, webhooks, manual replies, notes, and follow-up dates.

Manual verification confirms the dashboard is admin-only, imported contacts are never auto-sent, previews render safely with missing data, mock sends do not contact external services, and live sending remains disabled until provider configuration and explicit authorization exist.

