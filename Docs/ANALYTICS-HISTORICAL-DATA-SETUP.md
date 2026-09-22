# Historical analytics: step-by-step setup

This guide is for running the one-time historical import on a Mac. You do not need to change application code. It has two parts: prepare the database, then import the old traffic totals.

## Before you start

You will need access to the live site's Supabase project and Vercel project. Keep passwords, API tokens, and service-role keys private: do not paste them into chat, commit them to Git, or add them to this document.

The analytics code is already on `main`. If you just pushed it, wait for the Vercel deployment to finish before checking the dashboard.

## Part 1: Prepare the database

### 1. Open Terminal in the project folder

Open the **Terminal** app. Copy this command and press Return:

```sh
cd "/Users/eugene/WebDev Archive/akiwumiphoto/.worktrees/site-analytics"
```

If Terminal says the folder does not exist, open the project folder in Finder, right-click the `site-analytics` folder inside `.worktrees`, choose **New Terminal at Folder** (or **Services → New Terminal at Folder**), and continue there.

### 2. Sign in to Supabase

Run:

```sh
npx supabase login
```

Follow the link/instructions shown in Terminal. This signs the Supabase command-line tool in; it does not print or change your website password.

### 3. Find the Supabase project reference

In your browser, open the Supabase dashboard and select the project used by the live website. In **Project Settings → General**, copy the **Reference ID**. It is also the part after `/project/` in the project dashboard URL.

Back in Terminal, replace `PASTE_PROJECT_REF_HERE` with that value (keep the quotes) and run:

```sh
npx supabase link --project-ref "PASTE_PROJECT_REF_HERE"
```

Make sure this is the live site's project, not a test project.

### 4. Check which database changes are waiting

Run:

```sh
npx supabase migration list --linked
```

Look for `20260922170000` in the list:

- If it is already applied, continue to Part 2.
- If it is pending, and it is the **only** pending migration, run `npx supabase db push` and follow the prompt.
- If other migrations are also pending, stop here. `db push` applies all pending migrations, not just the analytics one. Ask your developer for help reviewing them before proceeding.

The migration name is `20260922170000_analytics_historical_summary.sql`. It creates the private storage and database function needed for the historical dashboard section.

## Part 2: Import historical Vercel traffic

### 5. Turn on Vercel Web Analytics and find the project ID

In Vercel, select the live website project. Open **Analytics** and make sure **Web Analytics** is enabled. Then open **Settings → General** and copy the **Project ID**. If Vercel shows that the project belongs to a team, also find the team's ID in the team settings.

### 6. Create a Vercel API token

In Vercel, open your account **Settings → Tokens**, create a token that has access to the website project, and copy it temporarily. Treat it like a password. You will enter it into Terminal without saving it in the project.

### 7. Enter the project settings in Terminal

Still in the Terminal window opened in step 1, replace each example value below with the correct non-secret value and run the lines. Keep the quotation marks. Use the **same Supabase project** you linked in Part 1.

```sh
export VERCEL_PROJECT_ID="PASTE_VERCEL_PROJECT_ID_HERE"
export SUPABASE_URL="https://PASTE_SUPABASE_PROJECT_REF_HERE.supabase.co"
```

If the Vercel project belongs to a team, also run this line with the team's ID. Skip it for a personal Vercel project:

```sh
export VERCEL_TEAM_ID="PASTE_VERCEL_TEAM_ID_HERE"
```

The next two commands ask for secrets without showing what you type. Paste each value at its prompt, then press Return:

```sh
read -s "VERCEL_API_TOKEN?Paste your Vercel API token, then press Return: "
export VERCEL_API_TOKEN
echo
read -s "SUPABASE_SERVICE_ROLE_KEY?Paste the Supabase service_role key, then press Return: "
export SUPABASE_SERVICE_ROLE_KEY
echo
```

Find the Supabase URL and `service_role` key under the Supabase project's **Settings → API** (the exact menu may say **API Keys**). The service-role key is secret and powerful; never share it or put it in a `NEXT_PUBLIC_...` variable. You only need it in this Terminal window for the import.

### 8. Run the import

Copy and run:

```sh
npm run analytics:import:vercel
```

Wait for a message beginning `Imported ... aggregate rows`. This can take a little while. It imports up to 365 days by default (limited by what Vercel still has available). You can safely run the command again if it is interrupted.

When it finishes, clear the secret values from this Terminal session:

```sh
unset VERCEL_API_TOKEN SUPABASE_SERVICE_ROLE_KEY VERCEL_PROJECT_ID VERCEL_TEAM_ID SUPABASE_URL
```

## Part 3: Check the result

1. Open the live website and sign in as an administrator.
2. Go to **Admin → Analytics**.
3. Choose a date range that includes dates before the new first-party analytics tracking began.
4. Look at **Earlier site activity** and **Daily traffic**. The visitor count is called **visitor-days** because it sums daily unique visitor counts; it is not a count of distinct people across the entire date range.

If the import reports an error, check that Web Analytics is enabled, the token can access the correct Vercel project, and the Supabase URL/key belong to the project where you applied the migration. Do not send tokens or keys when asking for help; share only the error message with secret values removed.

Historical order and verified-registration totals come from existing database records. They cannot be connected to specific past visitors. Contact form submissions cannot be backfilled because they were not saved in the site's database. More detail: [analytics-history-import.md](analytics-history-import.md).
