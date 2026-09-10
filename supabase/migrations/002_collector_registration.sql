-- Collectors who have purchased a photograph and registered their details.
-- Rows are only ever written by the server (service role) after validation,
-- so there is deliberately no INSERT/UPDATE policy for anon or authenticated.
CREATE TABLE public.collectors (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id   uuid UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
  email          text NOT NULL UNIQUE,
  first_name     text NOT NULL,
  last_name      text NOT NULL,
  phone          text NOT NULL,
  address_line1  text NOT NULL,
  address_line2  text,
  city           text NOT NULL,
  region         text,
  postcode       text NOT NULL,
  country_code   char(2) NOT NULL,
  email_verified boolean NOT NULL DEFAULT false,
  verified_at    timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),

  -- Stored lower-cased so the unique index doubles as a case-insensitive one.
  CONSTRAINT collectors_email_lower  CHECK (email = lower(email)),
  CONSTRAINT collectors_email_format CHECK (email ~ '^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$'),
  CONSTRAINT collectors_first_name_len CHECK (char_length(first_name) BETWEEN 2 AND 60),
  CONSTRAINT collectors_last_name_len  CHECK (char_length(last_name)  BETWEEN 2 AND 60),
  -- E.164 without the punctuation: the server normalises before writing.
  CONSTRAINT collectors_phone_format CHECK (phone ~ '^\+[1-9][0-9]{6,14}$'),
  CONSTRAINT collectors_country_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT collectors_address_len CHECK (char_length(address_line1) BETWEEN 4 AND 120),
  CONSTRAINT collectors_city_len    CHECK (char_length(city) BETWEEN 2 AND 80),
  CONSTRAINT collectors_postcode_len CHECK (char_length(postcode) BETWEEN 2 AND 16)
);

CREATE INDEX collectors_verified_idx ON public.collectors (email_verified, created_at DESC);

-- A collector telling us they have bought a print.
CREATE TABLE public.purchase_messages (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id       uuid NOT NULL REFERENCES public.collectors(id) ON DELETE CASCADE,
  artwork_title      text NOT NULL,
  purchase_reference text,
  purchased_on       date,
  purchased_from     text,
  message            text NOT NULL,
  status             text NOT NULL DEFAULT 'received',
  created_at         timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT purchase_messages_status CHECK (status IN ('received', 'reviewing', 'confirmed', 'rejected')),
  CONSTRAINT purchase_messages_artwork_len CHECK (char_length(artwork_title) BETWEEN 2 AND 160),
  CONSTRAINT purchase_messages_message_len CHECK (char_length(message) BETWEEN 10 AND 2000)
);

CREATE INDEX purchase_messages_collector_idx ON public.purchase_messages (collector_id, created_at DESC);

-- NOTE: the deployed database names this function update_updated_at_column;
-- 001_initial.sql creates it as update_updated_at. Rename in 001 before
-- replaying these migrations onto a fresh project.
CREATE TRIGGER collectors_updated_at
  BEFORE UPDATE ON public.collectors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Supabase Auth owns the proof that an address is real; this mirrors that fact
-- back onto the collector record so the app never has to read the auth schema.
CREATE OR REPLACE FUNCTION public.sync_collector_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  IF NEW.email_confirmed_at IS NOT NULL THEN
    UPDATE public.collectors
       SET auth_user_id   = NEW.id,
           email_verified = true,
           verified_at    = COALESCE(verified_at, NEW.email_confirmed_at)
     WHERE email = lower(NEW.email);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_verified
  AFTER INSERT OR UPDATE OF email_confirmed_at ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.sync_collector_verification();

ALTER TABLE public.collectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_messages ENABLE ROW LEVEL SECURITY;

-- A verified collector may read back their own record and their own messages.
-- Everything else — every write — goes through the service role on the server.
CREATE POLICY "Collectors can read their own record"
  ON public.collectors FOR SELECT
  TO authenticated
  USING (auth_user_id = (SELECT auth.uid()));

CREATE POLICY "Collectors can read their own purchase messages"
  ON public.purchase_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.collectors c
      WHERE c.id = purchase_messages.collector_id
        AND c.auth_user_id = (SELECT auth.uid())
    )
  );
