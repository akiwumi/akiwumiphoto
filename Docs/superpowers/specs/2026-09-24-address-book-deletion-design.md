# Address-book deletion design

## Goal

Allow outreach admins to permanently delete an entire contact category with its contacts, or selected address-book contacts, without leaving campaign history inconsistent.

## Category deletion

- The contacts screen lists categories with their current contact counts and a destructive delete action.
- Selecting delete opens a confirmation dialog naming the category and count.
- The admin must type the exact category name before the delete control enables.
- The server deletes contacts belonging to that category and then deletes the category in one database transaction.
- If any category contacts have queued, submitted, sent, delivered, opened, clicked, bounced, failed, replied, or otherwise recorded deliveries, deletion is blocked and the response reports the number protected.

## Bulk contact deletion

- The address-book table gains row checkboxes and a select-all-visible control that respects filters.
- A destructive bulk-delete action shows the selected count and requires confirmation.
- The server validates every submitted ID, deletes eligible contacts atomically, and reports contacts blocked by delivery history.
- The UI refreshes and announces the deleted and protected counts.

## Security and verification

- Existing outreach-admin authorization is required for every destructive endpoint.
- IDs are capped, de-duplicated, and never trusted without server-side lookup.
- Tests cover unauthorized requests, empty/invalid selections, category cascade behavior, delivery-history protection, and success summaries.
