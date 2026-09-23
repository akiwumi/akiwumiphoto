import { getAddressBook } from '@/lib/outreach/address-book-server';
import { getOutreachContactCategories } from '@/lib/outreach/categories-server';
import ContactDetailClient from './ContactDetailClient';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [contacts, categories] = await Promise.all([getAddressBook(), getOutreachContactCategories()]);
  return <ContactDetailClient id={id} contacts={contacts} categories={categories} />;
}
