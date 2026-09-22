# Historical analytics import

The dashboard combines consented first-party events with two clearly separated historical sources:

- Vercel Web Analytics aggregate daily page-view and visitor counts, plus aggregate page, referrer, and device breakdowns. Visitor totals are visitor-days (a person visiting on multiple days is counted on each day); historical sessions and visitor-level journeys are not available.
- Existing operational records provide historical checkout starts, paid orders, and verified registrations. These totals are not attributable to historical visitors. Contact submissions were not stored in the application database and cannot be backfilled.

## Import Vercel history

1. Apply the Supabase migrations, including `20260922170000_analytics_historical_summary.sql`, to the target project.
2. In Vercel, enable Web Analytics for the site project and create an API token that can read that project. Find the project ID and, for a team-owned project, the team ID.
3. In a secure local shell, set `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`), and `SUPABASE_SERVICE_ROLE_KEY`. Set `VERCEL_TEAM_ID` for a team project. Never commit these values or send them in chat.
4. Run `npm run analytics:import:vercel`. It imports up to 365 days by default; `ANALYTICS_HISTORY_DAYS` can select 1–366 days, subject to the reporting window available to the Vercel account.

The importer stops before the first first-party event's calendar day, preventing overlap between the aggregate legacy data and the new event stream. It excludes admin/auth/verification paths and strips query strings before storing aggregate rows. It is safe to rerun: rows are upserted by source, day, dimension, and dimension value. The Vercel API token and service-role key are required only for this import and are not stored by the site.

Until the migration is applied and the import is run with authorized project credentials, historical Vercel traffic will show as zero; existing order and registration totals become available when the migration is applied.
