import type { Metadata } from 'next';
import NavBar from '@/components/NavBar';
import BasketClient from './BasketClient';

export const metadata: Metadata = {
  title: 'Basket | Akiwumi Photo',
  robots: { index: false },
};

export default function BasketPage() {
  return (
    <main className="full-screen flex flex-col overflow-y-auto">
      <NavBar />
      <BasketClient />
    </main>
  );
}
