# Print registration receipts and administrator records

Status: proposed design for user approval.

## Outcome

After a verified collector submits the details of a purchased print, save a registration and email the collector a complete registration receipt. Give the studio administrator a searchable list of collectors, their registered prints, and a printable receipt for each registration.

## Recommended approach and alternatives

1. Recommended: extend the existing collectors and purchase_messages records, with a shared receipt layout for email and print. Preserves current registrations and avoids a second system.
2. Email with an attached PDF: adds PDF generation and attachment handling; browser Print / Save as PDF meets the stated printing need with fewer dependencies.
3. Separate customer-management system: adds synchronisation and another login without helping the immediate workflow.

## Registration and receipt

- Trigger receipt after the print details are saved, not after email verification alone.
- Rename the purchase message form and confirmation around registering a print.
- Receipt includes registration reference, registration date/time and timezone, collector name, email, phone and address, photograph title, order/edition reference, purchase date, purchase source, payment method, and notes.
- Interpret how the purchase was made as both source (website, studio, gallery/exhibition or another seller) and payment method (card, bank transfer, cash, other or unknown). Store only the method, never card numbers or bank credentials.
- Require purchase date and source on new registrations. Payment method can be unknown. Existing records with missing details display Not provided.
- Where an existing catalogue photograph is selected, include its title and thumbnail. Retain manual title entry for older or externally purchased prints.
- Preserve the values submitted with each registration so later changes to contact details do not silently alter its receipt.
- Label the document Print registration receipt and show its received/reviewed status. A collector submission does not itself verify payment or artwork authenticity.
- Confirmation screen provides View / Print registration. Print stylesheet supports paper and browser Save as PDF.

## Administrator access

- Add Registrations to the existing administrator dashboard.
- Search collectors by name or email; open their contact details and associated print registrations.
- Search registrations by reference or artwork title; filter existing review status and date.
- Detail view shows complete receipt, status, email attempt status, Print / Save as PDF, and Resend receipt.
- Existing registration records are visible. Do not automatically email historical registrations.
- Use existing administrator app_metadata role checks on the server and database access policies. Signed-in collectors can access only their own records.

## Delivery and error handling

- Use the existing Resend integration and verified sending domain; send to the verified collector email read server-side.
- Save registration and a durable pending receipt job together. Use a stable submission identifier to prevent duplicate registrations when requests are retried.
- Record provider acceptance separately from actual delivery; never show delivered based only on an API send success.
- Retry failed sends through a bounded server-side retry worker, with an administrator resend action and provider idempotency protection. A mail failure must not lose the registration.
- Escape user-supplied content in email and printable output.
- Existing Gmail delivery issue remains a separate provider investigation; adding receipts does not establish Gmail delivery.

## Validation

- Test one receipt job per submitted registration and duplicate-request handling.
- Test missing/invalid purchase data and legacy records.
- Test email rejection and retry without duplicate registrations.
- Test admin access, collector ownership, and anonymous access rejection.
- Verify receipt details match the stored registration snapshot and print view hides navigation.
- Run relevant lint/type/build checks and inspect administrator and collector flows.
- Any end-to-end email test will use an explicitly approved recipient.

## Deployment

Apply a reviewed database migration and deploy the application plus receipt retry worker together. No retroactive messages or changes to Stripe payment receipts.
