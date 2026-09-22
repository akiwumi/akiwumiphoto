import { normalizeEmail } from './domain';

export interface AddressBookContact {
  id: string;
  country: string;
  studio: string;
  name: string;
  role: string;
  designerEmail: string | null;
  studioEmail: string;
  email: string;
  website: string;
  source: string;
  approvedForOutreach: boolean;
  outreachStatus: 'not contacted';
  replied: boolean;
  suppressed: boolean;
}

export function addressBookCountry(value: unknown): string {
  return typeof value === 'string' && value.trim() ? value.trim() : 'Unknown';
}

export function campaignAudienceForCountries<T extends { country: unknown }>(
  recipients: T[],
  countries: readonly string[],
): T[] {
  if (countries.length === 0) return recipients;
  const selectedCountries = new Set(countries);
  return recipients.filter((recipient) => selectedCountries.has(addressBookCountry(recipient.country)));
}

export function campaignAudienceForCountry<T extends { country: unknown }>(
  recipients: T[],
  country: string,
): T[] {
  return campaignAudienceForCountries(recipients, country ? [country] : []);
}

export function campaignAudienceSelectionForVisible<T extends { id: string }>(
  currentIds: string[],
  visibleAvailable: T[],
  allVisibleAvailableSelected: boolean,
): string[] {
  const availableIds = new Set(visibleAvailable.map((entry) => entry.id));
  return allVisibleAvailableSelected
    ? currentIds.filter((id) => !availableIds.has(id))
    : [...currentIds.filter((id) => !availableIds.has(id)), ...visibleAvailable.map((entry) => entry.id)];
}

export function filterAddressBookContacts<T extends Pick<AddressBookContact, 'name' | 'studio' | 'email' | 'country'>>(
  contacts: T[],
  query: string,
  country: string,
): T[] {
  const normalizedQuery = query.trim().toLowerCase();
  return contacts.filter((contact) => {
    const matchesSearch = !normalizedQuery || [contact.name, contact.studio, contact.email, addressBookCountry(contact.country)]
      .some((value) => value.toLowerCase().includes(normalizedQuery));
    return matchesSearch && (!country || addressBookCountry(contact.country) === country);
  });
}

const SOURCE = 'scandinavian_interior_designers_contacts.xlsx';
const rows = [
  ['se-01', 'Sweden', 'Note Design Studio', 'Johannes Karlström', 'Founding Partner / Interior Architect', 'johannes@notedesignstudio.se', 'project@notedesignstudio.se', 'https://note-editions.notedesignstudio.se/studio'],
  ['se-02', 'Sweden', 'Note Design Studio', 'Cristiano Pigazzini', 'Founding Partner / Design Manager', 'cristiano@notedesignstudio.se', 'project@notedesignstudio.se', 'https://note-editions.notedesignstudio.se/studio'],
  ['se-03', 'Sweden', 'Halleroed', 'Christian & Ruxandra Halleröd', 'Founders / Design Studio', null, 'info@halleroed.com', 'https://halleroed.com/about'],
  ['se-04', 'Sweden', 'Lotta Agaton Interiors', 'Lotta Agaton', 'Founder / Interior Designer', null, 'info@lottaagaton.se', 'https://www.lottaagaton.se/pages/contact'],
  ['se-05', 'Sweden', 'Stylt Trampoli', 'Erik Nissen Johansen', 'Founder / Creative Director', 'erik@stylt.se', 'nb@stylt.se', 'https://www.stylt.se/contact'],
  ['se-06', 'Sweden', 'So Fine Design', 'Sofi Arnholm', 'Founder / Interior Designer', 'sofi@sofinedesign.se', 'info@sofinedesign.se', 'https://www.sofinedesign.se/'],
  ['dk-01', 'Denmark', 'Space Copenhagen', 'Signe Bindslev Henriksen & Peter Bundgaard Rützou', 'Founders / Interior Designers', null, 'mail@spacecph.com', 'https://spacecph.dk/contact/'],
  ['dk-02', 'Denmark', 'Norm Architects', 'Jonas Bjerre-Poulsen & Kasper Rønn', 'Founders / Architects & Designers', null, 'kg@normcph.com', 'https://normcph.com/contact/'],
  ['dk-03', 'Denmark', 'GamFratesi', 'Stine Gam & Enrico Fratesi', 'Founders / Designers', null, 'info@gamfratesi.com', 'https://www.gamfratesi.com/contact'],
  ['dk-04', 'Denmark', 'Søren Rose Studio', 'Søren Rose', 'Founder / Designer', null, 'hello@sorenrose.com', 'https://www.sorenrose.com/contact'],
  ['dk-05', 'Denmark', 'Studio Force Majeure', 'Founding design team', 'Interior & Design Studio', null, 'hello@studioforcemajeure.com', 'https://www.studioforcemajeure.com/contact'],
  ['no-01', 'Norway', 'Snøhetta', 'Julie Aars', 'Business Development / Senior Architect', 'julie@snohetta.com', 'nordics@snohetta.com', 'https://www.snohetta.com/contact'],
  ['no-02', 'Norway', 'Metropolis', 'Hanne C. Arvik', 'Partner / Interior Architect', 'hca@metropolis.no', 'post@metropolis.no', 'https://www.metropolis.no/kontakt/'],
  ['no-03', 'Norway', 'Sane interiørarkitekter', 'Myrna Becker', 'Partner / Managing Director', 'mb@sane.no', 'post@sane.no', 'https://sane.no/kontakt/'],
  ['no-04', 'Norway', 'Design House Oslo', 'Thea B. Mikkelsgård', 'Agency Director / Partner', 'thea@designhouse.no', 'hello@designhouse.no', 'https://www.designhouse.no/kontakt'],
  ['no-05', 'Norway', 'PART Design', 'Synnøve Ringstad', 'Design Director / Partner', 'synnove@part.no', 'design@part.no', 'https://part.no/kontakt'],
] as const;

export const ADDRESS_BOOK: AddressBookContact[] = rows.map(([id, country, studio, name, role, designerEmail, studioEmail, website]) => ({
  id, country, studio, name, role, designerEmail, studioEmail, email: normalizeEmail(designerEmail ?? studioEmail), website,
  source: SOURCE, approvedForOutreach: false, outreachStatus: 'not contacted', replied: false, suppressed: false,
}));

export const ADDRESS_BOOK_SOURCE = SOURCE;
