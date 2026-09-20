import { ADDRESS_BOOK } from '@/lib/outreach/address-book';
import ContactDetailClient from './ContactDetailClient';

export default async function ContactDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContactDetailClient id={id} contacts={ADDRESS_BOOK} />;
}
