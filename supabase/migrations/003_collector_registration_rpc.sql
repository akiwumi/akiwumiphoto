-- Registration happens before the collector has an account, so the insert
-- cannot be authorised by RLS. This is the single, narrow opening: it takes
-- exactly the columns the form collects, and every one of them still has to
-- satisfy the table's CHECK constraints. An unverified row grants nothing —
-- it cannot be read back or attached to a message until the address behind
-- it has been confirmed.
CREATE OR REPLACE FUNCTION public.register_collector(
  p_email         text,
  p_first_name    text,
  p_last_name     text,
  p_phone         text,
  p_address_line1 text,
  p_address_line2 text,
  p_city          text,
  p_region        text,
  p_postcode      text,
  p_country_code  text
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verified boolean;
BEGIN
  SELECT email_verified INTO v_verified
    FROM public.collectors
   WHERE email = lower(p_email);

  -- A verified record is never rewritten from a public form, or anyone who
  -- knew a collector's address could redirect where their prints are sent.
  IF v_verified THEN
    RETURN 'already_verified';
  END IF;

  INSERT INTO public.collectors AS c (
    email, first_name, last_name, phone,
    address_line1, address_line2, city, region, postcode, country_code
  ) VALUES (
    lower(p_email), p_first_name, p_last_name, p_phone,
    p_address_line1, nullif(p_address_line2, ''), p_city,
    nullif(p_region, ''), p_postcode, upper(p_country_code)
  )
  ON CONFLICT (email) DO UPDATE SET
    first_name    = EXCLUDED.first_name,
    last_name     = EXCLUDED.last_name,
    phone         = EXCLUDED.phone,
    address_line1 = EXCLUDED.address_line1,
    address_line2 = EXCLUDED.address_line2,
    city          = EXCLUDED.city,
    region        = EXCLUDED.region,
    postcode      = EXCLUDED.postcode,
    country_code  = EXCLUDED.country_code
  WHERE NOT c.email_verified;

  RETURN 'registered';
END;
$$;

REVOKE ALL ON FUNCTION public.register_collector(
  text, text, text, text, text, text, text, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.register_collector(
  text, text, text, text, text, text, text, text, text, text) TO anon, authenticated;

-- Once verified, a collector files their own messages under their own session;
-- the policy is what ties a message to its author, not anything in the form.
CREATE POLICY "Verified collectors can file their own purchase messages"
  ON public.purchase_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.collectors c
      WHERE c.id = purchase_messages.collector_id
        AND c.auth_user_id = (SELECT auth.uid())
        AND c.email_verified
    )
  );

-- Status is the studio's to set, so a submitted message always starts at
-- 'received' no matter what the caller put in the column.
CREATE OR REPLACE FUNCTION public.force_purchase_message_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.status := 'received';
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_messages_status_on_insert
  BEFORE INSERT ON public.purchase_messages
  FOR EACH ROW EXECUTE FUNCTION public.force_purchase_message_status();

-- These two only ever run as triggers. Leaving EXECUTE granted to the public
-- roles also exposes them at /rest/v1/rpc/..., which they were never meant for.
REVOKE ALL ON FUNCTION public.sync_collector_verification() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.force_purchase_message_status() FROM public, anon, authenticated;
