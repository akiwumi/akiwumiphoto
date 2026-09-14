import { NextResponse } from 'next/server';
import { getExchangeRates } from '@/lib/exchange-rates';

export async function GET() {
  return NextResponse.json(await getExchangeRates());
}
