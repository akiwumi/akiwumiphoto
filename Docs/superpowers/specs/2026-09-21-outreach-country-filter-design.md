# Outreach address-book country preservation and filtering

## Goal

Show every outreach contact using its imported `country` value and let an
administrator narrow the address-book table to one country.

## Data handling

`getAddressBook` will preserve every non-empty `outreach_contacts.country`
value. It will use `Unknown` only when an imported record has no country.
No database migration or update is required: the correction is in the
display-layer mapping that currently converts unsupported countries to Sweden.

The address-book contact country type will accept arbitrary country names so
future workbook imports are not constrained to the original Scandinavian
sample data.

## Interface

The contacts table toolbar will contain a labelled country select next to the
existing search input. Its default is `All countries`; its options are the
unique country labels in the current visible address book, alphabetically
sorted. Selecting an option combines with the text search, updates the table,
and updates the visible-contact count.

The manual-entry country select will use the same dynamic country list, with
Sweden retained as its initial value when it is available.

## Error handling and testing

Blank imported country values display and filter as `Unknown`. The data helper
will have a regression test proving that countries beyond Sweden, Denmark, and
Norway survive the server mapping. The client filtering behavior will be
covered with the project’s existing test conventions where practical.

## Scope

This change does not alter stored database data, import mapping, campaign
audience selection, or country-code-based checkout logic.
