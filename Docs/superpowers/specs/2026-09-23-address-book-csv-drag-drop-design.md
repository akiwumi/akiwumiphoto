# Address-book CSV and drag-and-drop import design

## Goal

Allow an outreach admin to add address-book contacts from `.csv` or `.xlsx` files using drag and drop or the existing file picker. Import usable contacts even when a source file contains rows with missing, malformed, or duplicate emails.

## Scope

- The import screen has one accessible drop zone for `.csv` and `.xlsx` files, with click-to-browse fallback.
- The existing SheetJS parsing path handles both file types, retaining header discovery and column aliases.
- Files remain capped at 10 MB.
- A row is importable only when it has a valid email that is not duplicated within the selected file.
- Invalid and duplicate-in-file rows are skipped. Valid rows are still upserted into the chosen contact category.
- The result reports imported/upserted, existing-contact, and skipped row counts. It also identifies skipped rows and their reasons.
- Batch metadata and audit logging preserve the invalid-row count.

## Data flow

1. Admin drops or chooses a CSV/XLSX file and selects a category.
2. Client submits the file to the existing import API.
3. The API verifies the extension and size, parses the first worksheet/CSV sheet, discovers the contact header, and applies column aliases.
4. The API removes rows with parser issues before looking up existing contacts or creating the Supabase upsert payload.
5. The API writes the batch, upserts valid contacts, records the imported count and audit event, and returns a concise skip report.
6. The UI refreshes the address-book snapshot and displays the summary.

## Error handling

- Unsupported extension, an empty worksheet, malformed file, missing category, unavailable database, and failed writes remain blocking errors.
- Email problems are non-blocking per-row issues. They never prevent valid contacts from importing.
- A file with no valid rows completes no write and returns a clear error stating that no valid email rows were found.

## Accessibility and UI

- Drop zone is a focusable control, has an explicit label and accepted-file hint, and opens the native picker on keyboard activation.
- Drag-over state has a visible affordance; dropping an unsupported file gives the same clear message as browsing.
- The result is announced through the existing visible success/error area and does not rely on color alone.

## Tests

- CSV and XLSX parsing both normalize valid emails and find data after title rows.
- Parser reports invalid and duplicate-in-file rows.
- Commit imports valid rows when invalid rows exist, excludes invalid rows from the database payload, and returns skipped-row details.
- Unsupported file type and all-invalid file cases fail without writes.
