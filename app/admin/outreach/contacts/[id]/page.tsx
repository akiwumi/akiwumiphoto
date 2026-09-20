import { getAddressBook } from '@/lib/outreach/address-book-server';
import ContactDetailClient from './ContactDetailClient';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailClient id={id} contacts={await getAddressBook()} />;
}
