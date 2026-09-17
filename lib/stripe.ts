/**
 * Server-only. The Stripe client, and the service-role Supabase client the
 * payment webhook settles orders with: buyers have no session, and marking an
 * order paid must be out of reach of the anon key.
 */
import Stripe from 'stripe';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let _stripe: Stripe | null = null;
let _service: SupabaseClient | null = null;

export function stripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
    _stripe = new Stripe(key);
  }
  return _stripe;
}

export function serviceClient(): SupabaseClient {
  if (!_service) {
    _service = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }
  return _service;
}

/** Stripe amounts are in cents. */
export const toCents = (usd: number) => Math.round(Number(usd) * 100);
export const fromCents = (cents: number) => cents / 100;
