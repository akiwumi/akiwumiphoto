-- Print shop: the size options every photograph is sold in, how many of each
-- edition have sold, which photographs are for sale, and the orders placed
-- through the basket.
--
-- Payment happens outside the site. An order records what a buyer asked for
-- and the studio sends payment links; sold counts are the studio's to update
-- once a sale completes, so placing an order never changes them.

-- Size options ----------------------------------------------------------------
-- Shared by every photograph. Each size is its own edition: a photograph can
-- sell edition_size prints of every size.

CREATE TABLE public.print_sizes (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 40),
  dimensions   text NOT NULL DEFAULT '' CHECK (char_length(dimensions) <= 40),
  -- Null means price on application: shown, but not purchasable.
  price_usd    numeric(10, 2) CHECK (price_usd IS NULL OR price_usd >= 0),
  edition_size integer NOT NULL CHECK (edition_size BETWEEN 1 AND 1000),
  sort_order   integer NOT NULL DEFAULT 0,
  active       boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_print_sizes_updated_at
  BEFORE UPDATE ON public.print_sizes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.print_sizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read active print sizes" ON public.print_sizes
  FOR SELECT USING (active);

CREATE POLICY "Admin full access" ON public.print_sizes
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Carry over the tiers the admin already priced in page_content (prints page).
INSERT INTO public.print_sizes (name, dimensions, price_usd, edition_size, sort_order)
SELECT tier.name,
       coalesce((SELECT value FROM public.page_content WHERE page = 'prints' AND key = tier.key || '_size'), tier.dimensions),
       (SELECT nullif(regexp_replace(value, '[^0-9.]', '', 'g'), '')::numeric
          FROM public.page_content WHERE page = 'prints' AND key = tier.key || '_price'),
       coalesce((SELECT nullif(regexp_replace(value, '[^0-9]', '', 'g'), '')::integer
                   FROM public.page_content WHERE page = 'prints' AND key = tier.key || '_edition'), tier.edition),
       tier.sort_order
FROM (VALUES
  ('small',  'Small',  '12 × 16"',  10, 0),
  ('medium', 'Medium', '20 × 24"',  10, 1),
  ('large',  'Large',  '30 × 40"',  10, 2),
  ('ultra',  'Ultra',  '48 × 60"+', 1,  3)
) AS tier(key, name, dimensions, edition, sort_order);

-- Which photographs are for sale ----------------------------------------------

ALTER TABLE public.gallery_images
  ADD COLUMN for_sale boolean NOT NULL DEFAULT true;

-- Sold counts ------------------------------------------------------------------

CREATE TABLE public.print_sales (
  image_id   uuid NOT NULL REFERENCES public.gallery_images (id) ON DELETE CASCADE,
  size_id    uuid NOT NULL REFERENCES public.print_sizes (id) ON DELETE CASCADE,
  sold       integer NOT NULL DEFAULT 0 CHECK (sold >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, size_id)
);

CREATE INDEX print_sales_size_id_idx ON public.print_sales (size_id);

ALTER TABLE public.print_sales ENABLE ROW LEVEL SECURITY;

-- Buyers see how much of each edition remains.
CREATE POLICY "Public can read sold counts" ON public.print_sales
  FOR SELECT USING (true);

CREATE POLICY "Admin full access" ON public.print_sales
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Orders -------------------------------------------------------------------------
-- Visible to the admin only. Written solely through submit_print_order, which
-- prices every line from the tables above rather than trusting the basket.

CREATE TABLE public.print_orders (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference     text NOT NULL UNIQUE,
  first_name    text NOT NULL,
  last_name     text NOT NULL,
  email         text NOT NULL,
  phone         text,
  country       text,
  message       text,
  -- The buyer's display currency; totals are authoritative in USD.
  currency      text NOT NULL,
  exchange_rate numeric(14, 6) NOT NULL,
  lines         jsonb NOT NULL,
  total_usd     numeric(12, 2) NOT NULL,
  status        text NOT NULL DEFAULT 'new'
                CHECK (status IN ('new', 'contacted', 'paid', 'cancelled')),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX print_orders_created_at_idx ON public.print_orders (created_at DESC);

ALTER TABLE public.print_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access" ON public.print_orders
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Placing an order -----------------------------------------------------------------
-- Buyers have no account, so the insert cannot be authorised by RLS. As with
-- register_collector, this is the one narrow opening: it validates the buyer's
-- details, re-prices every requested line, refuses anything unpublished, not
-- for sale, priced on application or beyond what remains of its edition, and
-- returns the priced lines for the confirmation email.

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
-- pg_temp last, so the working table below can never be shadowed by an
-- object a caller creates in their own temporary schema.
SET search_path = public, pg_temp
AS $$
DECLARE
  v_lines     jsonb;
  v_total     numeric(12, 2);
  v_problem   text;
  v_reference text;
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

  DROP TABLE IF EXISTS pg_temp.requested_lines;
  CREATE TEMP TABLE requested_lines ON COMMIT DROP AS
  WITH requested AS (
    SELECT (e ->> 'image_id')::uuid        AS image_id,
           (e ->> 'size_id')::uuid         AS size_id,
           sum((e ->> 'quantity')::integer) AS quantity
      FROM jsonb_array_elements(p_items) AS e
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
         (gi.id IS NOT NULL AND g.published AND gi.for_sale
            AND ps.id IS NOT NULL AND ps.active AND ps.price_usd IS NOT NULL) AS purchasable
    FROM requested r
    LEFT JOIN public.gallery_images gi ON gi.id = r.image_id
    LEFT JOIN public.galleries g       ON g.id = gi.gallery_id
    LEFT JOIN public.print_sizes ps    ON ps.id = r.size_id
    LEFT JOIN public.print_sales s     ON s.image_id = r.image_id AND s.size_id = r.size_id;

  SELECT coalesce(gallery_title, 'A photograph') || ' (' || coalesce(size_name, 'a size') || ')'
    INTO v_problem FROM requested_lines WHERE NOT purchasable LIMIT 1;
  IF v_problem IS NOT NULL THEN
    RAISE EXCEPTION 'unavailable' USING ERRCODE = '22023', DETAIL = v_problem;
  END IF;

  SELECT gallery_title || ', photo ' || position || ' (' || size_name || '): '
           || greatest(edition_size - sold, 0) || ' left'
    INTO v_problem FROM requested_lines
   WHERE quantity < 1 OR quantity > edition_size - sold LIMIT 1;
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
    currency, exchange_rate, lines, total_usd
  ) VALUES (
    v_reference, btrim(p_first_name), btrim(p_last_name), lower(btrim(p_email)),
    nullif(btrim(coalesce(p_phone, '')), ''), nullif(btrim(coalesce(p_country, '')), ''),
    nullif(btrim(coalesce(p_message, '')), ''),
    p_currency, p_exchange_rate, v_lines, v_total
  );

  RETURN jsonb_build_object('reference', v_reference, 'lines', v_lines, 'total_usd', v_total);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_print_order(
  text, text, text, text, text, text, text, numeric, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.submit_print_order(
  text, text, text, text, text, text, text, numeric, jsonb) TO anon, authenticated;

-- Editable prints page sections -------------------------------------------------------
-- One list item per line. Seeded with the text the page showed until now.

INSERT INTO public.page_content (page, key, value) VALUES
  ('prints', 'paper_heading', 'Paper & Quality'),
  ('prints', 'paper_items', E'Fine art archival giclée\nAcid-free cotton rag paper\n310gsm minimum weight\nPigment ink, 100-year archival rating\nMuseum standard production'),
  ('prints', 'certification_heading', 'Certification'),
  ('prints', 'certification_items', E'Each print hand-signed by the artist\nNumbered (e.g. 3/10) in pencil\nEmbossed certificate of authenticity\nOnce sold out — permanently retired\nUltra Large: one print, one owner')
ON CONFLICT (page, key) DO NOTHING;
