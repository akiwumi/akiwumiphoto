# Outreach contact categories design

## Goal

Organize outreach contacts into reusable categories such as Interior designers, Galleries, and Design stores. A user chooses one managed category before importing a workbook. Every imported contact is assigned that category. Categories are usable across the address book, new-campaign audience selection, and delivery reporting.

## Scope

- Each contact has zero or one category.
- Categories are managed reusable records, not free-text labels on each contact.
- A category is required for new workbook imports.
- Existing contacts remain uncategorized until an administrator assigns one.
- An administrator can change a contact category after import from its detail page.

## Data model

Add `outreach_contact_categories`:

- `id uuid primary key`
- `name text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

The category name is unique case-insensitively after trimming. The table uses the established outreach admin RLS policy.

Add nullable `category_id uuid references outreach_contact_categories(id)` to `outreach_contacts`, plus an index appropriate for category audience and report filtering. Existing rows keep a null category.

`outreach_contacts` continues to be the source of category state. Campaigns and delivery records resolve category through the associated contact, so a later reclassification is reflected consistently wherever current contact metadata is shown.

## Import flow

The import page loads existing categories into a dropdown and offers a create-category control.

1. The administrator selects an existing category or creates a new one.
2. The client sends the selected category identifier with the workbook upload.
3. The API validates that it identifies an existing category and rejects imports without it.
4. New contacts receive that category.
5. Existing contacts matched by email are updated with that category as part of the intentionally selected import assignment.

Creating a category trims whitespace. If the normalized name already exists, the UI/API resolves it to that existing category instead of making a duplicate. Empty category names are rejected.

## Address book

- Show category in the address-book list and relevant outreach overview preview.
- Add a category filter with an explicit Uncategorised option.
- Add a category selector to the individual contact detail page. Changing it updates only that contact’s category.

## Campaign audience

Add category filters next to the existing country filters in the new-campaign recipient step.

- No country selection means all countries; no category selection means all categories.
- Within each filter group, selected values are alternatives.
- When both groups have selections, a contact must match a selected country and selected category.
- Individual checkboxes and sent-contact exclusions remain the final audience controls.
- Uncategorized contacts are available through an explicit Uncategorised option.

## Delivery reports

- Include category in report queries and mapped report rows.
- Display category in the recipient details or a dedicated category column.
- Add category filtering that combines with country, status, and date filters.
- Use the contact’s current category, matching the address book and campaign audience behavior.

## Error handling

- The import button stays disabled until both a workbook and category are present.
- The API returns a clear validation error for a missing or invalid category.
- Duplicate category creation returns/reuses the existing category.
- Empty or whitespace-only category names are rejected in the client and API.
- Null category values are represented as Uncategorised in filters and UI.

## Verification

- Migration tests or checks cover schema and lookup indexes.
- Import tests cover new contacts, duplicate contacts, required category validation, and category assignment.
- Category helper tests cover normalization, filtering, and the Uncategorised value.
- Campaign tests cover the country/category intersection and no-filter behavior.
- Delivery-report tests cover category mapping and category filtering combined with existing filters.
- Run the relevant outreach test suite and production build after implementation.
