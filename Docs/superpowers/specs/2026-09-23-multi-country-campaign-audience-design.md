# Multi-country campaign audience selection

## Goal

Allow an outreach campaign operator to filter recipients by any combination of countries before bulk-selecting contacts.

## Interface

Replace the single-country select in the New campaign recipient picker with an accessible `Countries` checkbox menu. It contains an `All countries` action and one checkbox per country present in the address book.

No selected country means all countries are in view. Selecting one or more countries limits the recipient list to contacts in those countries. Selecting all available countries has the same visible result as no country filter.

## Behavior

The existing `Select all available` and `Deselect all` actions operate over the current multi-country view. They never select contacts with sent history. Individual selections remain intact when the country filter changes, and `Clear` still clears every selected recipient.

The counts continue to show selected recipients across the full campaign and available recipients within the current view.

## Data and errors

The country filter is client-only UI state. The persisted campaign draft continues to store recipient IDs only, so no migration or API change is required. Empty countries and unavailable sent contacts retain their current behavior.

## Verification

Add unit coverage for filtering with multiple selected countries and for bulk selection/deselection over that filtered set. Confirm existing single-country and all-country behavior remains valid, then run the outreach test suite and production build.
