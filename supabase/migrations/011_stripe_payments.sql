-- Card payment through Stripe Checkout.
--
-- Placing an order now holds its prints for 30 minutes while the buyer pays on
-- Stripe. Holds count against what remains of an edition, so two buyers can't
-- both pay for the last print. A completed payment marks the order paid and
-- adds its prints to the sold counts; an abandoned one simply lapses.
--
-- Orders placed before this migration keep their statuses ('new', 'contacted')
-- and are still settled by hand.

-- Orders -------------------------------------------------------------------------

ALTER TABLE public.print_orders DROP CONSTRAINT print_orders_status_check;
ALTER TABLE public.print_orders
  ADD CONSTRAINT print_orders_status_check
  CHECK (status IN ('new', 'contacted', 'pending_payment', 'paid', 'expired', 'cancelled'));
ALTER TABLE public.print_orders ALTER COLUMN status SET DEFAULT 'pending_payment';

ALTER TABLE public.print_orders
  ADD COLUMN hold_expires_at   timestamptz,
  ADD COLUMN stripe_session_id text UNIQUE,
  ADD COLUMN shipping_usd      numeric(10, 2),
  -- Name and address as collected by Stripe Checkout.
  ADD COLUMN shipping_address  jsonb,
  ADD COLUMN paid_at           timestamptz;

CREATE INDEX print_orders_holds_idx ON public.print_orders (hold_expires_at)
  WHERE status = 'pending_payment';

-- Every change to what remains of an edition takes this lock, so checking
-- availability and holding or selling prints can't interleave.
CREATE OR REPLACE FUNCTION public.lock_print_editions()
RETURNS void
LANGUAGE sql
SET search_path = public, pg_temp
AS $$
  SELECT pg_advisory_xact_lock(hashtext('public.print_editions'));
$$;

REVOKE ALL ON FUNCTION public.lock_print_editions() FROM public, anon, authenticated;

-- Placing an order -----------------------------------------------------------------
-- As in 006, plus: prints held by other unpaid orders count as taken, and the
-- new order holds its own prints until hold_expires_at.

CREATE OR REPLACE FUNCTION public.submit_print_order(
  p_first_name    text,
  p_last_name     text,
  p_email         text,
  p_phone         text,
  p_country       text,
  p_message       text,
  p_currency      text,
  p_exchange_rate numeric,
  p_items         jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lines     jsonb;
  v_total     numeric(12, 2);
  v_problem   text;
  v_reference text;
  -- A minute beyond the Stripe session's 30, so a payment completed at the
  -- last moment is never outlived by its hold.
  v_expires   timestamptz := now() + interval '31 minutes';
BEGIN
  IF char_length(btrim(coalesce(p_first_name, ''))) NOT BETWEEN 1 AND 80
     OR char_length(btrim(coalesce(p_last_name, ''))) NOT BETWEEN 1 AND 80
     OR char_length(coalesce(p_email, '')) > 254
     OR coalesce(p_email, '') !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
     OR char_length(coalesce(p_phone, '')) > 40
     OR char_length(coalesce(p_country, '')) > 80
     OR char_length(coalesce(p_message, '')) > 2000 THEN
    RAISE EXCEPTION 'invalid_customer' USING ERRCODE = '22023';
  END IF;

  IF coalesce(p_currency, '') !~ '^[A-Z]{3}$'
     OR p_exchange_rate IS NULL OR p_exchange_rate <= 0 OR p_exchange_rate > 100000 THEN
    RAISE EXCEPTION 'invalid_currency' USING ERRCODE = '22023';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'invalid_items' USING ERRCODE = '22023';
  END IF;

  PERFORM public.lock_print_editions();

  DROP TABLE IF EXISTS pg_temp.requested_lines;
  CREATE TEMP TABLE requested_lines ON COMMIT DROP AS
  WITH requested AS (
    SELECT (e ->> 'image_id')::uuid        AS image_id,
           (e ->> 'size_id')::uuid         AS size_id,
           sum((e ->> 'quantity')::integer) AS quantity
      FROM jsonb_array_elements(p_items) AS e
     GROUP BY 1, 2
  ),
  held AS (
    SELECT (l ->> 'image_id')::uuid AS image_id,
           (l ->> 'size_id')::uuid  AS size_id,
           sum((l ->> 'quantity')::integer) AS quantity
      FROM public.print_orders o, jsonb_array_elements(o.lines) AS l
     WHERE o.status = 'pending_payment' AND o.hold_expires_at > now()
     GROUP BY 1, 2
  )
  SELECT r.image_id,
         r.size_id,
         r.quantity,
         g.title AS gallery_title,
         g.slug  AS gallery_slug,
         gi.title AS image_title,
         regexp_replace(regexp_replace(split_part(gi.storage_path, '?', 1), '^.*/', ''), '\.[A-Za-z0-9]+$', '') AS file_ref,
         (SELECT count(*) FROM public.gallery_images x
           WHERE x.gallery_id = gi.gallery_id
             AND (x.sort_order, x.created_at, x.id) < (gi.sort_order, gi.created_at, gi.id)) + 1 AS position,
         ps.name AS size_name,
         ps.dimensions,
         ps.price_usd,
         ps.edition_size,
         coalesce(s.sold, 0) AS sold,
         coalesce(h.quantity, 0) AS held,
         (gi.id IS NOT NULL AND g.published AND gi.for_sale
            AND ps.id IS NOT NULL AND ps.active AND ps.price_usd IS NOT NULL) AS purchasable
    FROM requested r
    LEFT JOIN public.gallery_images gi ON gi.id = r.image_id
    LEFT JOIN public.galleries g       ON g.id = gi.gallery_id
    LEFT JOIN public.print_sizes ps    ON ps.id = r.size_id
    LEFT JOIN public.print_sales s     ON s.image_id = r.image_id AND s.size_id = r.size_id
    LEFT JOIN held h                   ON h.image_id = r.image_id AND h.size_id = r.size_id;

  SELECT coalesce(gallery_title, 'A photograph') || ' (' || coalesce(size_name, 'a size') || ')'
    INTO v_problem FROM requested_lines WHERE NOT purchasable LIMIT 1;
  IF v_problem IS NOT NULL THEN
    RAISE EXCEPTION 'unavailable' USING ERRCODE = '22023', DETAIL = v_problem;
  END IF;

  SELECT gallery_title || ', photo ' || position || ' (' || size_name || '): '
           || greatest(edition_size - sold - held, 0) || ' left'
           || CASE WHEN held > 0 THEN ' (others are reserved by a buyer checking out)' ELSE '' END
    INTO v_problem FROM requested_lines
   WHERE quantity < 1 OR quantity > edition_size - sold - held LIMIT 1;
  IF v_problem IS NOT NULL THEN
    RAISE EXCEPTION 'insufficient_edition' USING ERRCODE = '22023', DETAIL = v_problem;
  END IF;

  SELECT jsonb_agg(jsonb_build_object(
           'image_id',        image_id,
           'size_id',         size_id,
           'gallery_title',   gallery_title,
           'gallery_slug',    gallery_slug,
           'image_title',     image_title,
           'file_ref',        file_ref,
           'position',        position,
           'size_name',       size_name,
           'dimensions',      dimensions,
           'edition_size',    edition_size,
           'sold',            sold,
           'quantity',        quantity,
           'unit_price_usd',  price_usd,
           'line_total_usd',  price_usd * quantity
         ) ORDER BY gallery_title, position, price_usd),
         sum(price_usd * quantity)
    INTO v_lines, v_total
    FROM requested_lines;

  v_reference := 'AP-' || to_char(now() AT TIME ZONE 'Europe/Stockholm', 'YYMMDD')
                 || '-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));

  INSERT INTO public.print_orders (
    reference, first_name, last_name, email, phone, country, message,
    currency, exchange_rate, lines, total_usd, status, hold_expires_at
  ) VALUES (
    v_reference, btrim(p_first_name), btrim(p_last_name), lower(btrim(p_email)),
    nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_country, '')), ''),
    nullif(btrim(coalesce(p_message, '')), ''),
    p_currency, p_exchange_rate, v_lines, v_total, 'pending_payment', v_expires
  );

  RETURN jsonb_build_object('reference', v_reference, 'lines', v_lines, 'total_usd', v_total);
END;
$$;

-- Holds the buyer is still waiting on count as taken in the basket too.
CREATE OR REPLACE FUNCTION public.held_print_counts(p_image_ids uuid[])
RETURNS TABLE (image_id uuid, size_id uuid, held integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT (l ->> 'image_id')::uuid, (l ->> 'size_id')::uuid, sum((l ->> 'quantity')::integer)::integer
    FROM public.print_orders o, jsonb_array_elements(o.lines) AS l
   WHERE o.status = 'pending_payment' AND o.hold_expires_at > now()
     AND (l ->> 'image_id')::uuid = ANY (p_image_ids)
   GROUP BY 1, 2;
$$;

REVOKE ALL ON FUNCTION public.held_print_counts(uuid[]) FROM public;
GRANT EXECUTE ON FUNCTION public.held_print_counts(uuid[]) TO anon, authenticated;

-- Settling payment -------------------------------------------------------------------
-- Called only by the server with the service role, from the Stripe webhook.

CREATE OR REPLACE FUNCTION public.mark_print_order_paid(
  p_session_id       text,
  p_shipping_usd     numeric,
  p_shipping_address jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_order public.print_orders;
BEGIN
  PERFORM public.lock_print_editions();

  SELECT * INTO v_order FROM public.print_orders
   WHERE stripe_session_id = p_session_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'unknown_session' USING ERRCODE = '22023';
  END IF;
  -- Stripe can deliver an event more than once; only the first one counts.
  IF v_order.status = 'paid' THEN
    RETURN NULL;
  END IF;

  UPDATE public.print_orders
     SET status = 'paid', paid_at = now(), hold_expires_at = NULL,
         shipping_usd = p_shipping_usd, shipping_address = p_shipping_address
   WHERE id = v_order.id
  RETURNING * INTO v_order;

  INSERT INTO public.print_sales (image_id, size_id, sold)
  SELECT (l ->> 'image_id')::uuid, (l ->> 'size_id')::uuid, (l ->> 'quantity')::integer
    FROM jsonb_array_elements(v_order.lines) AS l
  ON CONFLICT (image_id, size_id)
  DO UPDATE SET sold = public.print_sales.sold + excluded.sold, updated_at = now();

  RETURN to_jsonb(v_order);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_print_order_paid(text, numeric, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_print_order_paid(text, numeric, jsonb) TO service_role;
