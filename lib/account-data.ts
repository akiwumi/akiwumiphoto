import type { SupabaseClient, User } from '@supabase/supabase-js';

export type AccountOrderLine = {
  gallery_title?: string;
  image_title?: string;
  size_name?: string;
  title?: string;
  artwork_title?: string;
  size?: string;
  dimensions?: string;
  quantity?: number;
  unit_price?: number;
  price?: number;
  line_total?: number;
  line_total_usd?: number;
  unit_price_usd?: number;
  total?: number;
  currency?: string;
  [key: string]: unknown;
};

export type AccountShippingAddress = {
  name?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
};

export type AccountOrder = {
  id: string;
  reference: string;
  currency: string;
  total_usd: number;
  shipping_usd: number;
  shipping_address: AccountShippingAddress | null;
  exchange_rate: number;
  status: string;
  created_at: string;
  lines: AccountOrderLine[];
};

export type AccountRegistration = {
  id: string;
  artwork_title: string;
  purchase_reference: string | null;
  purchased_on: string | null;
  status: string;
  created_at: string;
};

export type AccountCertificate = {
  id: string;
  registration_id: string;
  status: string;
  created_at: string;
  printed_at: string | null;
  print_number: number;
  edition_total: number;
  order_number: string;
  location: string;
  capture_year: number;
  image_snapshot: { title?: string; [key: string]: unknown } | null;
  serial_number: string | null;
  serial_request_status: 'pending' | 'approved' | 'denied' | null;
};

export type AccountData = {
  orders: AccountOrder[];
  registrations: AccountRegistration[];
  certificates: AccountCertificate[];
};

function linesFrom(value: unknown): AccountOrderLine[] {
  if (!Array.isArray(value)) return [];
  return value.filter((line): line is AccountOrderLine => Boolean(line && typeof line === 'object'));
}

/**
 * Reads account data through the authenticated Supabase client. RLS remains
 * the final ownership boundary; every query is also scoped to this user.
 */
export async function loadAccountData(db: SupabaseClient, user: User): Promise<AccountData> {
  const [{ data: orderRows, error: orderError }, { data: collectorRows, error: collectorError }, { data: certificateRows, error: certificateError }] = await Promise.all([
    db.from('print_orders')
      .select('id,reference,currency,total_usd,shipping_usd,shipping_address,exchange_rate,status,created_at,lines')
      .eq('auth_user_id', user.id)
      .eq('status', 'paid')
      .order('created_at', { ascending: false }),
    db.from('collectors')
      .select('id')
      .eq('auth_user_id', user.id)
      .eq('email_verified', true),
    db.from('print_certificates')
      .select('id,registration_id,status,created_at,printed_at,print_number,edition_total,order_number,location,capture_year,image_snapshot')
      .order('created_at', { ascending: false }),
  ]);

  if (orderError) throw orderError;
  if (collectorError) throw collectorError;
  if (certificateError) throw certificateError;

  const collectorIds = (collectorRows ?? []).map((row) => row.id);
  const certificateIds = (certificateRows ?? []).map((row) => row.id);
  const { data: requestRows, error: requestError } = certificateIds.length > 0
    ? await db.from('serial_number_requests').select('certificate_id,status,serial_number').in('certificate_id', certificateIds)
    : { data: [], error: null };
  if (requestError) throw requestError;
  const requestByCertificate = new Map((requestRows ?? []).map((row) => [row.certificate_id, row]));
  let registrations: AccountRegistration[] = [];
  if (collectorIds.length > 0) {
    const { data, error } = await db
      .from('purchase_messages')
      .select('id,artwork_title,purchase_reference,purchased_on,status,created_at')
      .in('collector_id', collectorIds)
      .order('created_at', { ascending: false });
    if (error) throw error;
    registrations = (data ?? []) as AccountRegistration[];
  }

  return {
    orders: (orderRows ?? []).map((row) => ({
      ...row,
      total_usd: Number(row.total_usd),
      shipping_usd: Number(row.shipping_usd ?? 0),
      shipping_address: row.shipping_address && typeof row.shipping_address === 'object' ? row.shipping_address : null,
      exchange_rate: Number(row.exchange_rate),
      lines: linesFrom(row.lines),
    })) as AccountOrder[],
    registrations,
    certificates: (certificateRows ?? []).map((certificate) => ({
      ...(certificate as AccountCertificate),
      serial_number: requestByCertificate.get(certificate.id)?.status === 'approved' ? requestByCertificate.get(certificate.id)?.serial_number ?? null : null,
      serial_request_status: requestByCertificate.get(certificate.id)?.status ?? null,
    })),
  };
}
