This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Environment variables

Set these in `.env.local` for local development, and in the hosting project's
environment settings for the deployed site.

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | yes | Supabase project URL. Galleries, videos and page content all come from here. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | Supabase anon key. Also signs the private gallery-images bucket, which its RLS policy permits. |
| `NEXT_PUBLIC_WEB3FORMS_ACCESS_KEY` | yes | Relays contact form enquiries. Public by Web3Forms' design — the form posts to them from the browser, since server-side posting is a paid feature. The destination inbox is bound to the key itself, not configured here. |
| `NEXT_PUBLIC_SITE_URL` | deployed only | Origin the print-registration verification link points back to, e.g. `https://akiwumiphoto.com`. Without it the link is built from the incoming request, which is right in local dev but wrong behind a proxy or on a preview deployment. |

If a page renders empty where you expect content, check the dev server output —
the data fetchers log why they came back with nothing.

## Print registration

`/register` records who owns a print. The flow is: validate → store → email a
verification link → the collector confirms → they can send a purchase message
and get an acknowledgement with a reference number.

"Real information" is enforced in three escalating steps, and the last one is
the only one a determined person cannot talk their way past:

1. **Shape** — `lib/collector-validation.ts`, run in the browser for fast
   feedback and again in the route handler, which is the copy that counts.
2. **Deliverable** — the email domain must actually accept mail (`lib/email-domain.ts`),
   and disposable inboxes are refused.
3. **Reachable** — nothing counts as registered until the collector opens the
   link we email them.

Writes never go through the public API directly. `collectors` has no INSERT
policy, so registration goes through the `register_collector` SECURITY DEFINER
function; a verified record is never rewritten from the public form. Once
verified, a collector files messages under their own session, and the RLS
policy — not the form — is what ties a message to its author.

### Two settings this depends on, both in the Supabase dashboard

1. **Custom SMTP** (Project Settings → Authentication → SMTP Settings).
   Supabase's built-in sender is rate limited to a couple of messages an hour
   and is only meant for development. Until real SMTP credentials are set,
   most collectors will never receive their verification email. No code change
   is needed — the app sends through whatever Supabase is configured to use.

2. **The confirmation email template** (Authentication → Email Templates →
   Magic Link). Point the link at `/auth/confirm` with a token hash:

   ```
   <a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=magiclink">Verify your account</a>
   ```

   The default `{{ .ConfirmationURL }}` template also works, but it returns a
   PKCE code, which only verifies in the browser the collector registered
   from — open the email on a different device and it fails. The token-hash
   form has no such restriction. `/auth/confirm` accepts both.

Also add the deployed origin under Authentication → URL Configuration →
Redirect URLs, or Supabase will refuse to send the collector back to it.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
