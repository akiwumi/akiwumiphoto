# Print Registration Receipts Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development to implement and review bounded tasks.

**Goal:** Save registrations with immutable contact snapshots, email receipts, and expose secure printable collector/admin records.
**Architecture:** Extend purchase_messages. A transaction creates registration and outbox. Authenticated RPC enforces collector ownership. Service-only queue claims use leases, stable provider idempotency keys and bounded retries. Shared receipt data powers HTML email and print. Admin APIs check app_metadata role and use service client only after authorization.
**Tech stack:** Next.js 16, React 19, Supabase PostgreSQL/Auth, Resend, Node test runner.

## Tasks
- [ ] Database: add payment_method, gallery_image_id, collector_snapshot, submission_id, outbox; RPC submit_print_registration, claim_registration_receipts, finish_registration_receipt, resend_registration_receipt. Add rollback SQL tests for owner access, unverified rejection, replay idempotency, snapshot, queue leasing and permission isolation. Preserve legacy rows with no automatic email.
- [ ] Receipt model and tests: lib/registration-receipt.ts holds typed data and escaped HTML/text rendering; tests cover all fields, legacy unknowns and malicious markup. Email accepted is not delivered.
- [ ] Server integration: purchase-message route uses authenticated transactional RPC then after() flushes one receipt. Worker processes durable jobs, uses timeout and provider idempotency, stops uncertain retries before provider key expiry. Protected scheduled endpoint retries and admin endpoint authorizes resend.
- [ ] Collector UX: payment method, required date/source, catalogue selection with manual fallback, submission UUID retained for retry, receipt link after success and history for signed-in collector.
- [ ] Admin UX: Registrations tab lists collectors (including those without prints) and registrations, search/status/date filters, details and printable receipt. Shared server receipt page authorizes owner/admin before loading private data.
- [ ] Validation: node regression tests, SQL tests in rollback, typecheck, targeted lint, production build, browser inspection; independent spec then quality reviews.
- [ ] Release: commit isolated work. Apply migration and deploy only once concrete reviewed result ready; record any required hosting/scheduler setup, test actual email only with approved destination.

## Verification commands
Run node --test tests/registration-receipt.test.cjs, npx tsc --noEmit and npm run build -- --webpack. Use SQL regression fixture transaction with ROLLBACK so tests never email users or retain fake records.
