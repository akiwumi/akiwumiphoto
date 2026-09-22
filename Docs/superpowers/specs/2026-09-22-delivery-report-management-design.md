# Delivery Report Management

## Goal

Let outreach administrators filter delivery reports by country and erase one
or more delivery records directly from the report.

## Filtering and selection

The report table will add a country dropdown with `All countries` plus sorted
country values derived from report contacts. It combines with the existing date,
status, and sort controls.

Each visible row gets a checkbox and the table gets a select-all-visible
checkbox. Selection follows the current filtered view, so changing filters does
not erase hidden selections accidentally. The toolbar shows the number of
selected rows and the filtered record count.

## Erasure behavior

An individual row offers an `Erase` action. The toolbar offers `Erase selected`
when one or more rows are selected. Both actions require a confirmation that
names the number of records affected.

Confirmed erasure deletes the selected `outreach_deliveries` rows. Their
`outreach_events` rows disappear through the existing foreign-key cascade.
Contacts, campaigns, Resend messages, and local sent-history records are not
deleted. On success, the report refreshes and summary counts reflect the new
data; on failure, the table keeps its current rows and shows an error.

## Security and server boundary

Deletion goes through an admin-only route using the existing outreach admin
authorization and service-client pattern. IDs are accepted only as a bounded,
deduplicated list and deletion is restricted to those IDs.

## Testing

Add tests for country filtering and selection behavior, plus route tests for
admin authorization, deduplication, successful deletion, and failure handling.
Run the full Node test suite and production build.

## Scope

No provider-side deletion is attempted. No contact or campaign records are
removed. No changes are made to delivery reconciliation or webhook handling.
