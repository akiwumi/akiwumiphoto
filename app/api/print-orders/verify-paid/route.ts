import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/stripe';

export const runtime = 'nodejs';

/** Confirms the paid return reference against the server-settled order. */
export async function GET(request: Request) {
  const reference = new URL(request.url).searchParams.get('ref');
  if (!reference || !/^AP-\d{6}-[0-9A-F]{5}$/.test(reference)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  try {
    const { data, error } = await serviceClient()
      .from('print_orders')
      .select('id')
      .eq('reference', reference)
      .eq('status', 'paid')
      .maybeSingle();
    if (error) throw error;
    return NextResponse.json({ ok: Boolean(data) });
  } catch (error) {
    console.error('[verify-paid] could not verify order:', error);
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
