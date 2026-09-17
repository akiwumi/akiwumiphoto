-- Registration and receipt enqueue commit together. Legacy messages send no mail.
ALTER TABLE public.purchase_messages
  ADD COLUMN payment_method text NOT NULL DEFAULT 'unknown'
    CHECK (payment_method IN ('card', 'bank_transfer', 'cash', 'other', 'unknown')),
  ADD COLUMN gallery_image_id uuid REFERENCES public.gallery_images(id) ON DELETE SET NULL,
  ADD COLUMN collector_snapshot jsonb,
  ADD COLUMN submission_id uuid,
  ADD CONSTRAINT purchase_messages_submission_unique UNIQUE (collector_id, submission_id);

DROP POLICY IF EXISTS "Verified collectors can file their own purchase messages" ON public.purchase_messages;
REVOKE INSERT ON public.purchase_messages FROM anon, authenticated;
CREATE POLICY "Admins can read collectors" ON public.collectors FOR SELECT TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
CREATE POLICY "Admins can read registrations" ON public.purchase_messages FOR SELECT TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE TABLE public.registration_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.purchase_messages(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','accepted','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 5),
  provider_id text,
  last_error text,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  first_attempt_at timestamptz
);
CREATE INDEX registration_receipts_due_idx ON public.registration_receipts(next_attempt_at)
  WHERE status IN ('pending','processing');
CREATE INDEX registration_receipts_registration_idx ON public.registration_receipts(registration_id, created_at DESC);
CREATE UNIQUE INDEX registration_receipts_one_active ON public.registration_receipts(registration_id)
  WHERE status IN ('pending','processing');
ALTER TABLE public.registration_receipts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.registration_receipts FROM anon, authenticated;
GRANT ALL ON public.registration_receipts TO service_role;

CREATE FUNCTION public.protect_registration_snapshot() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.collector_snapshot IS DISTINCT FROM OLD.collector_snapshot
     OR NEW.submission_id IS DISTINCT FROM OLD.submission_id
     OR NEW.collector_id IS DISTINCT FROM OLD.collector_id THEN
    RAISE EXCEPTION 'Registration identity and contact snapshot are immutable' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER registration_snapshot_immutable BEFORE UPDATE ON public.purchase_messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_registration_snapshot();
REVOKE ALL ON FUNCTION public.protect_registration_snapshot() FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.submit_print_registration(
  p_submission_id uuid, p_artwork_title text, p_purchase_reference text,
  p_purchased_on date, p_purchased_from text, p_payment_method text,
  p_message text, p_gallery_image_id uuid DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  c public.collectors;
  r public.purchase_messages;
BEGIN
  -- Serialize submissions for this collector, including competing first inserts.
  SELECT * INTO c FROM public.collectors
    WHERE auth_user_id = auth.uid() AND email_verified FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Verified collector required' USING ERRCODE = '42501'; END IF;
  IF p_submission_id IS NULL OR p_artwork_title IS NULL OR p_message IS NULL
     OR char_length(btrim(p_artwork_title)) NOT BETWEEN 2 AND 160
     OR char_length(btrim(p_message)) NOT BETWEEN 10 AND 2000
     OR char_length(coalesce(p_purchase_reference,'')) > 160
     OR char_length(coalesce(p_purchased_from,'')) > 160
     OR p_payment_method IS NULL
     OR p_payment_method NOT IN ('card','bank_transfer','cash','other','unknown')
     OR p_purchased_on > CURRENT_DATE OR p_purchased_on < DATE '1900-01-01' THEN
    RAISE EXCEPTION 'Invalid registration fields' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM public.purchase_messages
    WHERE collector_id = c.id AND submission_id = p_submission_id;
  IF FOUND THEN
    IF ROW(r.artwork_title,r.purchase_reference,r.purchased_on,r.purchased_from,r.payment_method,r.message,r.gallery_image_id)
       IS DISTINCT FROM ROW(p_artwork_title,p_purchase_reference,p_purchased_on,p_purchased_from,p_payment_method,p_message,p_gallery_image_id) THEN
      RAISE EXCEPTION 'Submission ID already used with different fields' USING ERRCODE = '23505';
    END IF;
    RETURN to_jsonb(r);
  END IF;
  IF p_gallery_image_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.gallery_images i JOIN public.galleries g ON g.id = i.gallery_id
    WHERE i.id = p_gallery_image_id AND g.published
  ) THEN RAISE EXCEPTION 'Photograph is not publicly available' USING ERRCODE = '22023'; END IF;
  INSERT INTO public.purchase_messages(collector_id,artwork_title,purchase_reference,purchased_on,
    purchased_from,payment_method,message,gallery_image_id,submission_id,collector_snapshot)
  VALUES(c.id,p_artwork_title,p_purchase_reference,p_purchased_on,p_purchased_from,p_payment_method,
    p_message,p_gallery_image_id,p_submission_id,jsonb_build_object(
      'email',c.email,'first_name',c.first_name,'last_name',c.last_name,'phone',c.phone,
      'address_line1',c.address_line1,'address_line2',c.address_line2,'city',c.city,
      'region',c.region,'postcode',c.postcode,'country_code',c.country_code)) RETURNING * INTO r;
  INSERT INTO public.registration_receipts(registration_id) VALUES(r.id);
  RETURN to_jsonb(r);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_print_registration(uuid,text,text,date,text,text,text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_print_registration(uuid,text,text,date,text,text,text,uuid) TO authenticated;

CREATE FUNCTION public.claim_registration_receipts(p_registration_id uuid DEFAULT NULL, p_limit integer DEFAULT 10)
RETURNS SETOF public.registration_receipts LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF p_limit IS NULL OR p_limit < 1 OR p_limit > 100 THEN
    RAISE EXCEPTION 'Limit must be between 1 and 100' USING ERRCODE = '22023';
  END IF;
  -- Expired unresolved jobs remain visible as failures; never retry beyond provider key lifetime.
  UPDATE public.registration_receipts SET status='failed', lease_until=NULL,
    last_error='Receipt delivery unresolved; manual review required'
  WHERE (p_registration_id IS NULL OR registration_id=p_registration_id)
    AND status IN ('pending','processing') AND (lease_until IS NULL OR lease_until <= now())
    AND (attempts >= 5 OR first_attempt_at <= now() - interval '20 hours');
  RETURN QUERY
  WITH due AS (
    SELECT id FROM public.registration_receipts
    WHERE (p_registration_id IS NULL OR registration_id=p_registration_id)
      AND ((status='pending' AND next_attempt_at <= now()) OR (status='processing' AND lease_until <= now()))
      AND attempts < 5 AND (first_attempt_at IS NULL OR first_attempt_at > now() - interval '20 hours')
    ORDER BY next_attempt_at, id FOR UPDATE SKIP LOCKED LIMIT p_limit
  )
  UPDATE public.registration_receipts j SET status='processing', attempts=j.attempts+1,
    first_attempt_at=coalesce(j.first_attempt_at,now()), lease_until=now()+interval '2 minutes'
  FROM due WHERE j.id=due.id RETURNING j.*;
END;
$$;

CREATE FUNCTION public.finish_registration_receipt(p_id uuid,p_attempt integer,p_provider_id text,p_error text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE n integer;
BEGIN
  UPDATE public.registration_receipts SET
    status=CASE WHEN nullif(btrim(p_provider_id),'') IS NOT NULL THEN 'accepted'
      WHEN attempts >= 5 OR first_attempt_at <= now()-interval '20 hours' THEN 'failed' ELSE 'pending' END,
    provider_id=nullif(btrim(p_provider_id),''),
    -- Provider errors may contain email addresses or HTML. Persist a safe fixed diagnostic.
    last_error=CASE WHEN nullif(btrim(p_provider_id),'') IS NOT NULL THEN NULL
      ELSE 'Receipt provider did not confirm acceptance' END,
    next_attempt_at=now()+make_interval(secs => least(3600,60*(2 ^ attempts)::integer)), lease_until=NULL
  WHERE id=p_id AND status='processing' AND attempts=p_attempt AND lease_until > now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n=1;
END;
$$;

CREATE FUNCTION public.resend_registration_receipt(p_registration_id uuid,p_allow_uncertain boolean DEFAULT false)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE j public.registration_receipts; result uuid;
BEGIN
  -- Registration lock serializes resend against other resends.
  PERFORM 1 FROM public.purchase_messages WHERE id=p_registration_id AND collector_snapshot IS NOT NULL FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Registration with contact snapshot required' USING ERRCODE='22023'; END IF;
  SELECT * INTO j FROM public.registration_receipts WHERE registration_id=p_registration_id
    ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE;
  IF FOUND THEN
    IF j.status IN ('pending','processing') THEN RETURN j.id; END IF;
    IF j.created_at > now()-interval '60 seconds' THEN
      RAISE EXCEPTION 'Wait before resending receipt' USING ERRCODE='22023';
    END IF;
    IF j.status='failed' AND j.first_attempt_at <= now()-interval '20 hours' AND NOT coalesce(p_allow_uncertain,false) THEN
      RAISE EXCEPTION 'Previous delivery uncertain; explicit duplicate risk acknowledgement required' USING ERRCODE='22023';
    END IF;
  END IF;
  INSERT INTO public.registration_receipts(registration_id) VALUES(p_registration_id) RETURNING id INTO result;
  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION public.claim_registration_receipts(uuid,integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_registration_receipt(uuid,integer,text,text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resend_registration_receipt(uuid,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_registration_receipts(uuid,integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_registration_receipt(uuid,integer,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.resend_registration_receipt(uuid,boolean) TO service_role;
