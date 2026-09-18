-- Run against a disposable Supabase database after migrations.
BEGIN;

DO $$
DECLARE
  order_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731111';
  user_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731112';
  other_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731113';
  pending_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731114';
  collector_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731115';
  registration_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731116';
  image_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731117';
  size_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731118';
  serial_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731119';
  certificate_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731120';
  gallery_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731121';
  receipt_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731122';
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

  INSERT INTO public.collectors
    (id, auth_user_id, email, first_name, last_name, phone, address_line1,
     city, postcode, country_code, email_verified, verified_at)
  VALUES (collector_id, user_id, 'account-owner@example.invalid', 'Account', 'Owner',
          '+46700000000', '12 Test Street', 'Stockholm', '12345', 'SE', true, now());
  INSERT INTO public.purchase_messages
    (id, collector_id, artwork_title, message, collector_snapshot)
  VALUES (registration_id, collector_id, 'Test Photograph', 'A valid registration message', '{}');
  INSERT INTO public.registration_receipts (id, registration_id)
  VALUES (receipt_id, registration_id);

  INSERT INTO public.galleries (id, title, slug, published)
  VALUES (gallery_id, 'Test Gallery', 'test-account-gallery', true);
  INSERT INTO public.gallery_images (id, gallery_id, storage_path, title)
  VALUES (image_id, gallery_id, 'test/account.jpg', 'Test Photograph');
  INSERT INTO public.print_sizes (id, name, edition_size, price_usd)
  VALUES (size_id, 'Test Size', 10, 100);
  INSERT INTO public.photo_serial_numbers (id, image_id, serial_number)
  VALUES (serial_id, image_id, '123456');
  INSERT INTO public.print_certificates
    (id, registration_id, image_id, size_id, serial_id, print_number, edition_total,
     order_number, location, capture_year, technical_information, image_history,
     purchaser_snapshot, image_snapshot, created_by)
  VALUES (certificate_id, registration_id, image_id, size_id, serial_id, 1, 10,
     'TEST-ACCOUNT-PAID', 'Stockholm', 2024, 'Technical details', 'Image history',
     '{}', '{}', user_id);

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
  UPDATE public.print_orders
     SET email = 'account-owner@example.invalid', auth_user_id = user_id
   WHERE id = order_id;
END $$;

-- The owner policy allows only the paid order for the current account.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b20d7f72-1021-4f41-83d0-989afc731112', true);
SELECT (
  count(*) = 1
  AND bool_and(reference = 'TEST-ACCOUNT-PAID')
) AS owner_sees_only_own_paid_order
FROM public.print_orders;
SELECT (count(*) = 1) AS owner_sees_own_registration
FROM public.purchase_messages;
SELECT (count(*) = 1) AS owner_sees_own_receipt
FROM public.registration_receipts;
SELECT (count(*) = 1) AS owner_sees_own_certificate
FROM public.print_certificates;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b20d7f72-1021-4f41-83d0-989afc731113', true);
SELECT (count(*) = 0) AS cross_user_cannot_read_paid_orders FROM public.print_orders;
SELECT (count(*) = 0) AS cross_user_cannot_read_registrations FROM public.purchase_messages;
SELECT (count(*) = 0) AS cross_user_cannot_read_receipts FROM public.registration_receipts;
SELECT (count(*) = 0) AS cross_user_cannot_read_certificates FROM public.print_certificates;
RESET ROLE;

SELECT (NOT has_table_privilege('anon', 'public.print_orders', 'SELECT')) AS anonymous_order_read_denied,
       (NOT has_table_privilege('anon', 'public.purchase_messages', 'SELECT')) AS anonymous_registration_read_denied,
       (NOT has_table_privilege('anon', 'public.registration_receipts', 'SELECT')) AS anonymous_receipt_read_denied,
       (NOT has_table_privilege('anon', 'public.print_certificates', 'SELECT')) AS anonymous_certificate_read_denied;

ROLLBACK;
