import { isCountryCode } from './countries';

/**
 * Registration is the only place the public writes to the database, so the
 * rules live here and are applied on the server. The browser runs the same
 * checks for fast feedback, but nothing client-side is trusted: the route
 * handler re-validates, and the table's CHECK constraints backstop both.
 *
 * "Real information" is enforced in three escalating steps:
 *   1. shape        — the rules below
 *   2. deliverable  — the email domain must actually accept mail (see the route)
 *   3. reachable    — the collector has to click the link we email them
 */

export type FieldErrors = Record<string, string>;

export interface CollectorDetails {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  region: string | null;
  postcode: string;
  country_code: string;
}

export interface PurchaseMessageDetails {
  artwork_title: string;
  purchase_reference: string | null;
  purchased_on: string | null;
  purchased_from: string | null;
  message: string;
}

// Trims and collapses runs of whitespace, so " John   Q " and "John Q" are
// the same value and length limits mean what they say.
function clean(value: unknown): string {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
}

function optional(value: unknown): string | null {
  const cleaned = clean(value);
  return cleaned === '' ? null : cleaned;
}

// Mailbox providers that exist to be thrown away. Registration is a record of
// ownership, so an address the collector cannot be reached at later is no use.
const DISPOSABLE_DOMAINS = new Set([
  '0-mail.com', '10minutemail.com', '20minutemail.com', '33mail.com', 'anonbox.net',
  'burnermail.io', 'dispostable.com', 'emailondeck.com', 'fakeinbox.com', 'getairmail.com',
  'getnada.com', 'guerrillamail.com', 'guerrillamail.info', 'inboxbear.com', 'mail-temp.com',
  'mail7.io', 'mailcatch.com', 'maildrop.cc', 'mailinator.com', 'mailnesia.com', 'mailsac.com',
  'mintemail.com', 'moakt.com', 'mohmal.com', 'mytemp.email', 'sharklasers.com', 'spam4.me',
  'spamgourmet.com', 'temp-mail.io', 'temp-mail.org', 'tempail.com', 'tempinbox.com',
  'tempmail.net', 'tempmailo.com', 'tempr.email', 'throwawaymail.com', 'trashmail.com',
  'trashmail.de', 'yopmail.com', 'yopmail.fr',
]);

// Placeholders people type to get past a form. Compared against the whole
// field, so a real "Test" surname would need a second word to pass — which
// is the trade we want on a two-to-sixty character name.
const PLACEHOLDER_WORDS = new Set([
  'test', 'testing', 'tester', 'asdf', 'asdfg', 'asdfgh', 'qwerty', 'qwertyui', 'abc', 'abcd',
  'abcde', 'xyz', 'aaa', 'foo', 'bar', 'baz', 'none', 'null', 'nil', 'na', 'n/a', 'nope',
  'unknown', 'anonymous', 'anon', 'nobody', 'noname', 'firstname', 'lastname', 'yourname',
  'name', 'surname', 'blah', 'dummy', 'sample', 'example', 'fake', 'whatever', 'nothing',
]);

// Letters from any script, plus the punctuation real names carry.
const NAME_PATTERN = /^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}'’.\-]*[\p{L}\p{M}.]$/u;
const EMAIL_PATTERN = /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/;
const POSTCODE_PATTERN = /^[\p{L}\p{N}][\p{L}\p{N}\p{Zs}-]*[\p{L}\p{N}]$/u;

function looksLikePlaceholder(value: string): boolean {
  const normalised = value.toLowerCase().replace(/[\s.'’-]/g, '');
  if (PLACEHOLDER_WORDS.has(normalised)) return true;
  // "aaaa", "jjjjj" — no real name repeats one letter four times running.
  if (/(.)\1{3,}/u.test(normalised)) return true;
  return false;
}

function validateName(value: string, label: string): string | null {
  if (!value) return `${label} is required.`;
  if (value.length < 2) return `${label} must be at least 2 characters.`;
  if (value.length > 60) return `${label} must be 60 characters or fewer.`;
  if (!NAME_PATTERN.test(value)) return `${label} may only contain letters, spaces, hyphens and apostrophes.`;
  if (looksLikePlaceholder(value)) return `Please enter your real ${label.toLowerCase()}.`;
  return null;
}

export function normaliseEmail(value: unknown): string {
  return clean(value).toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email) return 'Email address is required.';
  if (email.length > 254) return 'That email address is too long.';
  if (!EMAIL_PATTERN.test(email)) return 'Enter a valid email address.';
  if (email.includes('..')) return 'Enter a valid email address.';

  const domain = email.slice(email.lastIndexOf('@') + 1);
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return 'Please use a permanent email address — disposable inboxes are not accepted.';
  }
  return null;
}

/**
 * Reduces a typed number to E.164. We require the country prefix rather than
 * guessing one: the collector may be anywhere, and a wrong guess silently
 * stores an unreachable number.
 */
export function normalisePhone(value: unknown): string {
  const raw = clean(value).replace(/[\s().\-/]/g, '');
  // 00 is the international prefix in most of the world.
  if (raw.startsWith('00')) return `+${raw.slice(2)}`;
  return raw;
}

export function validatePhone(phone: string): string | null {
  if (!phone) return 'Phone number is required.';
  if (!phone.startsWith('+')) return 'Include your country code, for example +44 or +1.';
  if (!/^\+[1-9][0-9]{6,14}$/.test(phone)) return 'Enter a valid phone number, digits only after the country code.';
  return null;
}

/** Validates and normalises the registration form. */
export function validateCollector(input: Record<string, unknown>): {
  values: CollectorDetails;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};

  const first_name = clean(input.first_name);
  const last_name = clean(input.last_name);
  const email = normaliseEmail(input.email);
  const phone = normalisePhone(input.phone);
  const address_line1 = clean(input.address_line1);
  const address_line2 = optional(input.address_line2);
  const city = clean(input.city);
  const region = optional(input.region);
  const postcode = clean(input.postcode).toUpperCase();
  const country_code = clean(input.country_code).toUpperCase();

  const firstNameError = validateName(first_name, 'First name');
  if (firstNameError) errors.first_name = firstNameError;

  const lastNameError = validateName(last_name, 'Last name');
  if (lastNameError) errors.last_name = lastNameError;

  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;

  const phoneError = validatePhone(phone);
  if (phoneError) errors.phone = phoneError;

  if (!address_line1) {
    errors.address_line1 = 'Street address is required.';
  } else if (address_line1.length < 4 || address_line1.length > 120) {
    errors.address_line1 = 'Street address must be between 4 and 120 characters.';
  } else if (!/\p{L}/u.test(address_line1)) {
    errors.address_line1 = 'Street address must include the street name.';
  } else if (looksLikePlaceholder(address_line1)) {
    errors.address_line1 = 'Please enter your real street address.';
  }

  if (address_line2 && address_line2.length > 120) {
    errors.address_line2 = 'This line must be 120 characters or fewer.';
  }

  const cityError = validateName(city, 'City');
  if (cityError) errors.city = cityError;

  if (region && region.length > 80) {
    errors.region = 'State or region must be 80 characters or fewer.';
  }

  if (!postcode) {
    errors.postcode = 'Postcode or ZIP is required.';
  } else if (postcode.length < 2 || postcode.length > 16) {
    errors.postcode = 'Postcode must be between 2 and 16 characters.';
  } else if (!POSTCODE_PATTERN.test(postcode)) {
    errors.postcode = 'Postcode may only contain letters, numbers, spaces and hyphens.';
  }

  if (!country_code) {
    errors.country_code = 'Country is required.';
  } else if (!isCountryCode(country_code)) {
    errors.country_code = 'Select a country from the list.';
  }

  return {
    values: {
      email,
      first_name,
      last_name,
      phone,
      address_line1,
      address_line2,
      city,
      region,
      postcode,
      country_code,
    },
    errors,
  };
}

/** Validates and normalises the "I've bought a print" message. */
export function validatePurchaseMessage(input: Record<string, unknown>): {
  values: PurchaseMessageDetails;
  errors: FieldErrors;
} {
  const errors: FieldErrors = {};

  const artwork_title = clean(input.artwork_title);
  const purchase_reference = optional(input.purchase_reference);
  const purchased_from = optional(input.purchased_from);
  const purchased_on = optional(input.purchased_on);
  // Message keeps its line breaks; only the ends are trimmed.
  const message = typeof input.message === 'string' ? input.message.trim() : '';

  if (!artwork_title) {
    errors.artwork_title = 'Tell us which photograph you bought.';
  } else if (artwork_title.length < 2 || artwork_title.length > 160) {
    errors.artwork_title = 'Title must be between 2 and 160 characters.';
  }

  if (purchase_reference && purchase_reference.length > 80) {
    errors.purchase_reference = 'Reference must be 80 characters or fewer.';
  }

  if (purchased_from && purchased_from.length > 120) {
    errors.purchased_from = 'This must be 120 characters or fewer.';
  }

  if (purchased_on) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(purchased_on)) {
      errors.purchased_on = 'Enter the date as YYYY-MM-DD.';
    } else {
      const when = new Date(`${purchased_on}T00:00:00Z`);
      if (Number.isNaN(when.getTime())) {
        errors.purchased_on = 'That is not a real date.';
      } else if (when.getTime() > Date.now() + 86_400_000) {
        errors.purchased_on = 'The purchase date cannot be in the future.';
      }
    }
  }

  if (!message) {
    errors.message = 'A message is required.';
  } else if (message.length < 10) {
    errors.message = 'Please give us a little more detail — at least 10 characters.';
  } else if (message.length > 2000) {
    errors.message = 'Message must be 2000 characters or fewer.';
  }

  return {
    values: { artwork_title, purchase_reference, purchased_on, purchased_from, message },
    errors,
  };
}
