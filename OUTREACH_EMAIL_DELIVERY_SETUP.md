# Outreach Email Delivery Setup

This guide covers the settings required to send the personalized outreach mailer to real recipients.

## Current status

The local outreach build currently uses a mock email provider. It records messages locally but does not deliver email.

Before production sending, the real provider adapter, sender domain, image hosting, unsubscribe flow, webhook handling, and deployment environment must be configured.

## Recommended provider

Use a transactional email provider such as Resend, Postmark, Mailgun, or Amazon SES. The examples below use Resend-style settings.

Resend documentation:

- [Email API](https://resend.com/features/email-api)
- [Domain verification](https://resend.com/changelog/domain-verification-events)
- [Webhooks](https://www.resend.com/features/webhooks)

## 1. Provider account

1. Create an account with the chosen provider.
2. Create an API key with the minimum permissions needed to send email.
3. Store the API key only in the deployment environment.
4. Never commit the API key to GitHub or place it in client-side code.

Example environment settings:

```env
OUTREACH_PROVIDER=resend
RESEND_API_KEY=re_xxxxxxxxx
OUTREACH_FROM_EMAIL=Eugene Akiwumi <info@akiwumiphoto.com>
OUTREACH_REPLY_TO_EMAIL=info@akiwumiphoto.com
SITE_URL=https://www.akiwumiphoto.com
OUTREACH_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

The current code still returns `MockOutreachProvider` from `lib/outreach/providers/index.ts`. A real provider adapter must replace that implementation before any message can be delivered.

## 2. Verify the sending domain

Verify:

```text
akiwumiphoto.com
```

Use a sender address on the verified domain:

```text
info@akiwumiphoto.com
```

The provider will display exact DNS records to add. Add those records at the DNS provider managing `akiwumiphoto.com`.

Required records normally include:

- SPF
- DKIM
- Return-path or bounce domain
- Provider-specific verification records

Do not invent the values. Copy the exact values supplied by the email provider.

## 3. Add DMARC

Start in monitoring mode:

```txt
Host: _dmarc
Type: TXT
Value: v=DMARC1; p=none; rua=mailto:dmarc@akiwumiphoto.com
```

After testing alignment and delivery, move gradually to:

```txt
v=DMARC1; p=quarantine; rua=mailto:dmarc@akiwumiphoto.com
```

Then, when confident:

```txt
v=DMARC1; p=reject; rua=mailto:dmarc@akiwumiphoto.com
```

Use the provider's exact recommendations if they differ.

## 4. Make mailer images permanent

The current local preview signs Supabase image URLs. Signed URLs expire and must not be used as the permanent source for production email.

Use permanent public HTTPS URLs, for example:

```html
<img src="https://www.akiwumiphoto.com/images/running-for-president.jpg" alt="Running For President — photograph by Eugene Akiwumi">
<img src="https://www.akiwumiphoto.com/images/the-political-clown.jpg" alt="The Political Clown — documentary photograph by Eugene Akiwumi">
```

Each image must:

- Be accessible without login.
- Use HTTPS.
- Return the correct image `Content-Type`.
- Have a stable, non-expiring URL.
- Be reasonably compressed in file size.
- Include descriptive `alt` text.

Alternative: attach the images inline using Content-ID attachments supported by the provider. Do not use `localhost`, relative paths, `file://`, `srcdoc`, or expiring signed URLs in delivered email.

## 5. Email HTML requirements

For Gmail, Outlook, Apple Mail, and mobile clients:

- Use a table-based layout.
- Keep the content width around 600–640px.
- Prefer inline CSS.
- Keep the existing plain-text fallback.
- Use absolute HTTPS links.
- Do not use JavaScript.
- Do not use iframes.
- Do not rely on external fonts for layout.
- Keep image dimensions explicit.
- Include mobile responsive rules where supported.
- Include descriptive image `alt` text.

The current mailer is close to production-ready structurally, but the image URLs must be made permanent and the final HTML should be tested in multiple email clients.

## 6. Sender and reply settings

Recommended values:

```env
OUTREACH_FROM_EMAIL=Eugene Akiwumi <info@akiwumiphoto.com>
OUTREACH_REPLY_TO_EMAIL=info@akiwumiphoto.com
```

The visible From address, DKIM domain, SPF domain, and reply address should be aligned with the verified domain whenever possible.

## 7. Unsubscribe handling

Every outreach message should include a clear unsubscribe link, such as:

```text
https://www.akiwumiphoto.com/outreach/unsubscribe?token=RECIPIENT_TOKEN
```

The send request should also include:

```txt
List-Unsubscribe: <https://www.akiwumiphoto.com/outreach/unsubscribe?token=RECIPIENT_TOKEN>
List-Unsubscribe-Post: List-Unsubscribe=One-Click
```

The application should:

1. Generate a recipient-specific unsubscribe token.
2. Store unsubscribe status.
3. Prevent future sends to unsubscribed recipients.
4. Process provider complaint and suppression events.

The current provider interface supports custom headers, but the send route still needs to pass unsubscribe headers and the app needs an unsubscribe endpoint and persistence.

## 8. Webhooks and delivery status

Configure the provider webhook to call a public HTTPS route such as:

```text
https://www.akiwumiphoto.com/api/admin/outreach/webhooks/resend
```

Store and process at least these events:

- `email.sent`
- `email.delivered`
- `email.delivery_delayed`
- `email.bounced`
- `email.complained`
- `email.failed`
- `email.suppressed`
- Unsubscribe events

Set:

```env
OUTREACH_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

Verify webhook signatures before accepting events. Never trust an unsigned webhook request.

The existing webhook route needs provider-specific signature verification and durable database persistence before it can be used in production.

## 9. Durable production storage

The current browser address book, sent history, drafts, manual contacts, and contact edits use local browser storage. That means they are not shared across devices or users.

For production, store these in the application database:

- Contacts
- Manual contact fields
- Custom contact categories
- Notes
- Campaigns
- Campaign recipients
- Sent messages
- Provider message IDs
- Delivery events
- Bounce and complaint status
- Unsubscribe status

The sent page should read from the database rather than only from browser local storage.

## 10. Bulk sending safeguards

Before enabling real sending:

- Skip already-sent recipients using a database uniqueness constraint.
- Add an idempotency key per recipient send.
- Send sequentially or with a controlled concurrency limit.
- Stop or pause on repeated provider failures.
- Exclude bounced, complained, suppressed, and unsubscribed contacts.
- Require a final confirmation page.
- Log the exact rendered subject, HTML, text, recipient, and provider ID.
- Keep an audit trail of who initiated the send.

The local build already has recipient selection, duplicate highlighting, copy editing, final preview, and local mock confirmation. These safeguards must be backed by server-side persistence before production sending.

## 11. Testing sequence

Before sending a real batch:

1. Send to the sender's own Gmail address.
2. Send to an Outlook address.
3. Send to an iCloud address.
4. Confirm the HTML and plain-text versions.
5. Confirm both mailer images load.
6. Confirm links work.
7. Confirm the footer displays `info@akiwumiphoto.com`.
8. Test mobile rendering.
9. Test unsubscribe.
10. Test a bounced address.
11. Check spam placement and authentication headers.
12. Send a small batch before the complete audience.

## Production readiness checklist

- [ ] Real provider adapter replaces `MockOutreachProvider`.
- [ ] Provider API key is configured as a server-only secret.
- [ ] `akiwumiphoto.com` is verified with the provider.
- [ ] SPF is configured.
- [ ] DKIM is configured.
- [ ] DMARC is configured.
- [ ] From address is `info@akiwumiphoto.com`.
- [ ] Reply-to address is configured.
- [ ] Mailer images use permanent public HTTPS URLs or inline attachments.
- [ ] HTML tested in Gmail, Outlook, Apple Mail, and mobile clients.
- [ ] Plain-text fallback tested.
- [ ] Unsubscribe link and List-Unsubscribe headers implemented.
- [ ] Bounce and complaint suppression implemented.
- [ ] Webhook signatures verified.
- [ ] Delivery events stored durably.
- [ ] Duplicate protection is server-side.
- [ ] Idempotency keys are enabled.
- [ ] Manual contacts and notes are stored durably.
- [ ] Final preview is required before sending.
- [ ] Small test batch delivered successfully.
- [ ] Legal basis and outreach compliance reviewed for recipient countries.

## Important current limitation

Do not switch the UI from “local mock provider” to a real provider until the provider adapter, DNS authentication, permanent image URLs, unsubscribe handling, webhook verification, and durable contact storage are complete. Otherwise the app may report a successful send while images fail, duplicates occur, or bounces and unsubscribes are not respected.
