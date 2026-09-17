# Print Certificate and Serial Registry Design

Status: approved direction; awaiting written-spec review before implementation.

## Goal

Give the administrator a controlled way to create and print a certificate of authenticity for a registered print. A certificate contains the purchaser's registration details, order number, a six-digit serial number, edition position, image information, technical print information, image history, and a blank signature area.

## Numbering model

- `serial_number` is exactly six digits and uniquely belongs to one photograph. It is entered and maintained by the administrator in that photograph's serial registry.
- `print_number` is the edition position shown separately, such as `4/10`. It is not the serial number. The numerator must be a positive integer and the denominator must match the selected print size's edition size.
- A serial number can be used for at most one certificate. Consumption happens in the same transaction that creates the certificate, so two administrators cannot use it concurrently.
- A serial number may not be reused after a certificate is printed. Voiding a draft does not release the serial; releasing a serial requires an explicit administrator action and a reason, and is disabled once the certificate has been marked printed.

## Admin workflow

1. In Admin → Prints, open a photograph and manage its valid six-digit serial-number list. The screen shows available, reserved, printed, and released numbers. Duplicate or malformed numbers are rejected.
2. In Admin → Registrations, open a registered print and choose Create certificate.
3. Select the photograph and print size, enter the edition position, six-digit serial number, order number, location, year the photograph was taken, technical print information, and image history. Registration and purchaser fields are loaded from the immutable registration snapshot and are read-only.
4. Save. A transaction validates the serial belongs to that photograph and is unused, validates the edition position against the selected size, snapshots all certificate fields, consumes the serial, and links the certificate to the registration and image.
5. Preview the certificate, then Print / Save as PDF. The admin can mark it Printed after printing. A printed certificate cannot be edited; create a replacement certificate with a new serial if a correction is needed.

## Certificate content and layout

The printable document includes:

- Akiwumi Photo identity and certificate title.
- Small passport-photo-size preview of the purchased image, with an accessible title/caption.
- Certificate reference, registration date, and printed date.
- Purchaser name, email, phone, delivery/location information, and order number.
- Photograph title, edition position (`4/10`), six-digit serial number, print size, and dimensions.
- Year the photograph was taken.
- Technical information of the print and the image history supplied by the administrator.
- A blank signature line labelled Artist signature and a date line.
- A statement that the certificate records the studio's registration and does not itself prove payment.

The screen preview and print view use the same data. Print CSS hides navigation and controls, keeps the image and signature area together, and uses a paper-safe light layout. User-entered text is escaped in HTML and preserves intentional line breaks.

## Data model

Add `photo_serial_numbers` with photograph id, six-digit serial, state (`available`, `reserved`, `printed`, `released`), certificate id when used, timestamps, and release reason. The photograph is the ownership boundary; print size is not part of serial uniqueness.

Add `print_certificates` with registration id, photograph id, print size id, serial registry id, edition position and total, order number, location, capture year, technical information, image history, immutable purchaser snapshot, immutable image snapshot, status (`draft`, `printed`, `void`), created/printed timestamps, and the creating administrator. Store snapshots so later profile, catalogue, or image edits cannot change a certificate that was printed.

The database exposes administrator-only functions for adding/removing registry entries, creating certificates, marking printed, and voiding drafts. Creation locks the serial row and verifies all ownership and edition constraints before consuming it. Direct client writes are revoked. Existing registrations and catalogue images remain unchanged.

## Access and errors

- Only an administrator can manage serials or certificates. Collectors can view their own registration receipt but cannot view or edit certificate administration fields.
- Unknown photograph, unknown print size, invalid six-digit serial, serial belonging to another photograph, already-used serial, invalid edition position, and missing required certificate fields return specific form errors beside the field.
- If the image has been removed after registration, the certificate retains its stored image snapshot or reports that no preview is available; it does not silently substitute another image.
- A failed save consumes neither a serial nor a certificate. A concurrent attempt reports that the serial was already used.

## Validation and testing

- Unit-test six-digit validation, edition-position parsing, field escaping, receipt/certificate formatting, and passport-image sizing.
- Database-test serial ownership, duplicate registry rejection, concurrent certificate creation, edition bounds, snapshot immutability, administrator-only writes, draft voiding, and printed-certificate immutability.
- Browser-test the admin create flow, field-specific errors, certificate preview, print stylesheet, and the collector's restricted access.
- Run TypeScript, lint, production build, and migration checks before deployment.

## Deployment

Apply the migration before deploying the application. Seed no serial numbers automatically; the administrator enters the approved list per photograph. Existing registrations receive no certificate and no serial consumption until the admin creates one.
