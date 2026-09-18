-- Run against a disposable Supabase database after migrations.
BEGIN;

DO $$
DECLARE
  order_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731111';
  user_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731112';
  other_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731113';
  pending_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731114';
  result jsonb;
BEGIN
  INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
  VALUES
    (user_id, 'account-owner@example.invalid', now(), now(), now()),
    (other_id, 'other-owner@example.invalid', now(), now(), now());

  INSERT INTO public.print_orders
    (id, reference, first_name, last_name, email, currency, exchange_rate, lines, total_usd, status)
  VALUES
    (order_id, 'TEST-ACCOUNT-PAID', 'Account', 'Owner', 'account-owner@example.invalid', 'USD', 1,
     '[]'::jsonb, 100, 'paid'),
    (pending_id, 'TEST-ACCOUNT-PENDING', 'Account', 'Owner', 'account-owner@example.invalid', 'USD', 1,
     '[]'::jsonb, 100, 'pending_payment');

  result := public.link_paid_order_to_user(order_id, user_id);
  IF result->>'linked' <> 'true' OR result->>'already_linked' <> 'false' THEN
    RAISE EXCEPTION 'initial paid-order link failed';
  END IF;
  result := public.link_paid_order_to_user(order_id, user_id);
  IF result->>'already_linked' <> 'true' THEN RAISE EXCEPTION 'link retry was not idempotent'; END IF;

  BEGIN
    PERFORM public.link_paid_order_to_user(order_id, other_id);
    RAISE EXCEPTION 'cross-user relink should fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  BEGIN
    PERFORM public.link_paid_order_to_user(pending_id, user_id);
    RAISE EXCEPTION 'pending order should not link';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;

  UPDATE public.print_orders SET auth_user_id = NULL, email = 'other-owner@example.invalid' WHERE id = order_id;
  BEGIN
    PERFORM public.link_paid_order_to_user(order_id, user_id);
    RAISE EXCEPTION 'email mismatch should fail';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;

-- The owner policy allows only the paid order for the current account.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b20d7f72-1021-4f41-83d0-989afc731112', true);
SELECT (
  count(*) = 1
  AND bool_and(reference = 'TEST-ACCOUNT-PAID')
) AS owner_sees_only_own_paid_order
FROM public.print_orders;
RESET ROLE;

ROLLBACK;
