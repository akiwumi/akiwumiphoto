# Enable historical analytics data

The dashboard code can be deployed before the database change; if the historical-summary RPC is not available yet, the live dashboard continues to show first-party analytics and historical sections remain empty until setup is complete.

## 1. Apply the Supabase migration

From the repository root, authenticate and link the Supabase CLI to the correct project:

```sh
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_REF
npx supabase migration list --linked
```

Review the migration list before continuing. If there are unrelated pending migrations, inspect them first. When the historical migration is the expected pending change, apply migrations:

```sh
npx supabase db push
```

This includes `supabase/migrations/20260922170000_analytics_historical_summary.sql`, which adds a private aggregate table and an admin-only summary function. Do not apply the migration to a different Supabase project than the live site uses.

## 2. Import historical Vercel traffic

In Vercel, enable Web Analytics on the site project and create an API token with access to read its analytics. Get the Vercel project ID, and team ID if the project belongs to a team. Set these values in a secure local shell (not in this file, source code, or chat):

- `VERCEL_API_TOKEN`
- `VERCEL_PROJECT_ID`
- `VERCEL_TEAM_ID` (team-owned project only)
- `SUPABASE_URL` (or `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

Use the Supabase URL and service-role key from the same project where you applied the migration. Then run:

```sh
npm run analytics:import:vercel
```

The default imports up to 365 days; set `ANALYTICS_HISTORY_DAYS` to a value from 1 to 366 to change that. Vercel's account reporting window may be shorter. The importer skips dates on or after the first first-party event's day, removes query strings, excludes admin/auth/verification paths, and stores aggregate counts only. It is safe to rerun.

## 3. Confirm in the admin dashboard

Open **Admin → Analytics**, select a date range that includes the imported period, and check **Earlier site activity** and **Daily traffic**. Legacy traffic is shown as visitor-days (daily unique counts summed across days), not unique people across the selected range. Historical orders and registrations are totals from existing records and cannot be attributed to individual visitors. Contact submissions cannot be reconstructed because they were not stored in the application database.

For importer details and source limitations, see [analytics-history-import.md](analytics-history-import.md).
