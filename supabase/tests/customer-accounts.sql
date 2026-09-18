-- Run against a disposable Supabase database after migrations.
BEGIN;

DO $$
DECLARE
  order_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731111';
  user_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731112';
  other_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731113';
  unverified_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731129';
  pending_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731114';
  other_order_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731123';
  collector_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731115';
  registration_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731116';
  image_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731117';
  size_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731118';
  serial_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731119';
  certificate_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731120';
  gallery_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731121';
  receipt_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731122';
  other_collector_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731124';
  other_registration_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731125';
  other_receipt_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731126';
  other_serial_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731127';
  other_certificate_id uuid := 'b20d7f72-1021-4f41-83d0-989afc731128';
  result jsonb;
BEGIN
  INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
  VALUES
    (user_id, 'account-owner@example.invalid', now(), now(), now()),
    (other_id, 'other-owner@example.invalid', now(), now(), now()),
    (unverified_id, 'unverified@example.invalid', NULL, now(), now());

  INSERT INTO public.print_orders
    (id, reference, first_name, last_name, email, currency, exchange_rate, lines, total_usd, status)
  VALUES
    (order_id, 'TEST-ACCOUNT-PAID', 'Account', 'Owner', 'account-owner@example.invalid', 'USD', 1,
     '[]'::jsonb, 100, 'paid'),
    (pending_id, 'TEST-ACCOUNT-PENDING', 'Account', 'Owner', 'account-owner@example.invalid', 'USD', 1,
     '[]'::jsonb, 100, 'new'),
    (other_order_id, 'TEST-ACCOUNT-OTHER', 'Other', 'Owner', 'other-owner@example.invalid', 'USD', 1,
     '[]'::jsonb, 100, 'paid');

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
  INSERT INTO public.collectors
    (id, auth_user_id, email, first_name, last_name, phone, address_line1,
     city, postcode, country_code, email_verified, verified_at)
  VALUES (other_collector_id, other_id, 'other-owner@example.invalid', 'Other', 'Owner',
          '+46700000001', '13 Test Street', 'Stockholm', '12345', 'SE', true, now());
  INSERT INTO public.collectors
    (id, auth_user_id, email, first_name, last_name, phone, address_line1,
     city, postcode, country_code, email_verified)
  VALUES ('b20d7f72-1021-4f41-83d0-989afc731130', unverified_id,
          'unverified@example.invalid', 'Unverified', 'Owner', '+46700000002',
          '14 Test Street', 'Stockholm', '12345', 'SE', false);
  INSERT INTO public.purchase_messages
    (id, collector_id, artwork_title, message, collector_snapshot)
  VALUES (other_registration_id, other_collector_id, 'Other Photograph', 'Another valid registration', '{}');
  INSERT INTO public.registration_receipts (id, registration_id)
  VALUES (other_receipt_id, other_registration_id);

  INSERT INTO public.galleries (id, title, slug, published)
  VALUES (gallery_id, 'Test Gallery', 'test-account-gallery', true);
  INSERT INTO public.gallery_images (id, gallery_id, storage_path, title)
  VALUES (image_id, gallery_id, 'test/account.jpg', 'Test Photograph');
  INSERT INTO public.print_sizes (id, name, edition_size, price_usd)
  VALUES (size_id, 'Test Size', 10, 100);
  INSERT INTO public.photo_serial_numbers (id, image_id, serial_number)
  VALUES (serial_id, image_id, '123456');
  INSERT INTO public.photo_serial_numbers (id, image_id, serial_number)
  VALUES (other_serial_id, image_id, '123457');
  INSERT INTO public.print_certificates
    (id, registration_id, image_id, size_id, serial_id, print_number, edition_total,
     order_number, location, capture_year, technical_information, image_history,
     purchaser_snapshot, image_snapshot, created_by)
  VALUES (certificate_id, registration_id, image_id, size_id, serial_id, 1, 10,
     'TEST-ACCOUNT-PAID', 'Stockholm', 2024, 'Technical details', 'Image history',
     '{}', '{}', user_id);
  INSERT INTO public.print_certificates
    (id, registration_id, image_id, size_id, serial_id, print_number, edition_total,
     order_number, location, capture_year, technical_information, image_history,
     purchaser_snapshot, image_snapshot, created_by)
  VALUES (other_certificate_id, other_registration_id, image_id, size_id, other_serial_id, 2, 10,
     'TEST-ACCOUNT-OTHER', 'London', 2024, 'Other technical details', 'Other image history',
     '{}', '{}', other_id);
  UPDATE public.print_orders SET auth_user_id = other_id WHERE id = other_order_id;

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

DO $$
DECLARE n integer;
BEGIN
  IF NOT has_function_privilege('service_role', 'public.link_paid_order_to_user(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('anon', 'public.link_paid_order_to_user(uuid,uuid)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.link_paid_order_to_user(uuid,uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'link function privileges are too broad';
  END IF;
END $$;

-- The owner policy allows only the paid order for the current account.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b20d7f72-1021-4f41-83d0-989afc731112', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.print_orders) <> 1 OR
     (SELECT reference FROM public.print_orders LIMIT 1) <> 'TEST-ACCOUNT-PAID' THEN RAISE EXCEPTION 'owner order RLS failed'; END IF;
  IF (SELECT count(*) FROM public.purchase_messages) <> 1 OR
     (SELECT artwork_title FROM public.purchase_messages LIMIT 1) <> 'Test Photograph' THEN RAISE EXCEPTION 'owner registration RLS failed'; END IF;
  IF (SELECT count(*) FROM public.registration_receipts) <> 1 THEN RAISE EXCEPTION 'owner receipt RLS failed'; END IF;
  IF (SELECT count(*) FROM public.print_certificates) <> 1 OR
     (SELECT order_number FROM public.print_certificates LIMIT 1) <> 'TEST-ACCOUNT-PAID' THEN RAISE EXCEPTION 'owner certificate RLS failed'; END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b20d7f72-1021-4f41-83d0-989afc731113', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.print_orders) <> 1 OR
     (SELECT reference FROM public.print_orders LIMIT 1) <> 'TEST-ACCOUNT-OTHER' THEN RAISE EXCEPTION 'other order RLS failed'; END IF;
  IF (SELECT count(*) FROM public.purchase_messages) <> 1 OR
     (SELECT artwork_title FROM public.purchase_messages LIMIT 1) <> 'Other Photograph' THEN RAISE EXCEPTION 'other registration RLS failed'; END IF;
  IF (SELECT count(*) FROM public.registration_receipts) <> 1 THEN RAISE EXCEPTION 'other receipt RLS failed'; END IF;
  IF (SELECT count(*) FROM public.print_certificates) <> 1 OR
     (SELECT order_number FROM public.print_certificates LIMIT 1) <> 'TEST-ACCOUNT-OTHER' THEN RAISE EXCEPTION 'other certificate RLS failed'; END IF;
END $$;
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub', 'b20d7f72-1021-4f41-83d0-989afc731129', true);
DO $$ BEGIN
  IF (SELECT count(*) FROM public.collectors) <> 0 OR
     (SELECT count(*) FROM public.purchase_messages) <> 0 OR
     (SELECT count(*) FROM public.registration_receipts) <> 0 OR
     (SELECT count(*) FROM public.print_certificates) <> 0 THEN RAISE EXCEPTION 'unverified collector RLS failed'; END IF;
END $$;
RESET ROLE;

DO $$
BEGIN
  SET LOCAL ROLE anon;
  BEGIN
    PERFORM count(*) FROM public.print_orders;
    RAISE EXCEPTION 'anonymous order query unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM count(*) FROM public.purchase_messages;
    RAISE EXCEPTION 'anonymous registration query unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM count(*) FROM public.registration_receipts;
    RAISE EXCEPTION 'anonymous receipt query unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
  BEGIN
    PERFORM count(*) FROM public.print_certificates;
    RAISE EXCEPTION 'anonymous certificate query unexpectedly succeeded';
  EXCEPTION WHEN insufficient_privilege THEN NULL; END;
END $$;
RESET ROLE;

ROLLBACK;
