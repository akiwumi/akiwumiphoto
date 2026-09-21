# Campaign Recipient Country Filter

## Goal

Let an administrator narrow new-campaign recipients by country before selecting
them for an outreach campaign.

## Data and selection behavior

`CampaignAudience` will derive the sorted country options from its current,
non-erased contact list. The default selection is `All countries`.

Changing country only changes the displayed recipient rows. It never clears
recipient IDs already selected from another country. The selected count remains
the count for the complete campaign audience, not only the filtered view.

`Select all available` and `Deselect all` act only on available contacts in the
currently displayed country. Sent contacts remain disabled and excluded from
both operations. Draft persistence continues to store the full `selectedIds`
set unchanged.

## Interface

Place a labelled country select above the recipient list, using the existing
outreach controls and responsive filter styling. The toolbar count will show
the number of visible available recipients as well as the total campaign
selection, making the filter’s scope clear.

## Testing

Add a pure recipient-filtering helper with Node test coverage for country
matching and selection preservation. Verify the full test suite and production
build after implementation.

## Scope

This does not change campaign drafts, send eligibility, sent history, imports,
or the address-book filter.
