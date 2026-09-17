CREATE TABLE public.photo_serial_numbers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id uuid NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  serial_number char(6) NOT NULL CHECK (serial_number ~ '^[0-9]{6}$'),
  used_at timestamptz,
  certificate_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (image_id, serial_number),
  UNIQUE (certificate_id)
);

CREATE TABLE public.print_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid NOT NULL REFERENCES public.purchase_messages(id) ON DELETE RESTRICT,
  image_id uuid NOT NULL REFERENCES public.gallery_images(id) ON DELETE RESTRICT,
  size_id uuid NOT NULL REFERENCES public.print_sizes(id) ON DELETE RESTRICT,
  serial_id uuid NOT NULL UNIQUE REFERENCES public.photo_serial_numbers(id) ON DELETE RESTRICT,
  print_number integer NOT NULL CHECK (print_number > 0),
  edition_total integer NOT NULL CHECK (edition_total > 0),
  order_number text NOT NULL CHECK (char_length(btrim(order_number)) BETWEEN 1 AND 120),
  location text NOT NULL CHECK (char_length(btrim(location)) BETWEEN 1 AND 160),
  capture_year integer NOT NULL CHECK (capture_year BETWEEN 1800 AND 2100),
  technical_information text NOT NULL CHECK (char_length(btrim(technical_information)) BETWEEN 2 AND 4000),
  image_history text NOT NULL CHECK (char_length(btrim(image_history)) BETWEEN 2 AND 6000),
  purchaser_snapshot jsonb NOT NULL,
  image_snapshot jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','printed','void')),
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  printed_at timestamptz,
  CONSTRAINT certificate_print_number_in_edition CHECK (print_number <= edition_total)
);
ALTER TABLE public.photo_serial_numbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.print_certificates ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.photo_serial_numbers, public.print_certificates FROM anon, authenticated;
GRANT SELECT ON public.photo_serial_numbers, public.print_certificates TO authenticated;
CREATE POLICY "Admins can read certificate data" ON public.photo_serial_numbers FOR SELECT TO authenticated USING (((SELECT auth.jwt())->'app_metadata'->>'role')='admin');
CREATE POLICY "Admins can read certificates" ON public.print_certificates FOR SELECT TO authenticated USING (((SELECT auth.jwt())->'app_metadata'->>'role')='admin');
CREATE INDEX print_certificates_registration_idx ON public.print_certificates(registration_id, created_at DESC);
CREATE INDEX photo_serial_numbers_image_idx ON public.photo_serial_numbers(image_id, serial_number);

CREATE OR REPLACE FUNCTION public.admin_add_photo_serial(p_image_id uuid, p_serial_number text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE r public.photo_serial_numbers;
BEGIN
  IF ((SELECT auth.jwt())->'app_metadata'->>'role') <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gallery_images WHERE id=p_image_id) OR p_serial_number !~ '^[0-9]{6}$' THEN RAISE EXCEPTION 'Invalid photograph or serial number' USING ERRCODE='22023'; END IF;
  INSERT INTO public.photo_serial_numbers(image_id,serial_number) VALUES(p_image_id,p_serial_number) RETURNING * INTO r;
  RETURN to_jsonb(r);
EXCEPTION WHEN unique_violation THEN RAISE EXCEPTION 'That serial number already exists for this photograph' USING ERRCODE='23505';
END; $$;

CREATE OR REPLACE FUNCTION public.admin_create_print_certificate(
  p_registration_id uuid, p_image_id uuid, p_size_id uuid, p_serial_number text,
  p_print_number integer, p_edition_total integer, p_order_number text, p_location text,
  p_capture_year integer, p_technical_information text, p_image_history text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE reg public.purchase_messages; image_row public.gallery_images; size_row public.print_sizes; serial_row public.photo_serial_numbers; cert public.print_certificates;
BEGIN
  IF ((SELECT auth.jwt())->'app_metadata'->>'role') <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  SELECT * INTO reg FROM public.purchase_messages WHERE id=p_registration_id FOR UPDATE;
  SELECT * INTO image_row FROM public.gallery_images WHERE id=p_image_id;
  SELECT * INTO size_row FROM public.print_sizes WHERE id=p_size_id;
  SELECT * INTO serial_row FROM public.photo_serial_numbers WHERE image_id=p_image_id AND serial_number=p_serial_number FOR UPDATE;
  IF reg.id IS NULL OR image_row.id IS NULL OR size_row.id IS NULL OR serial_row.id IS NULL THEN RAISE EXCEPTION 'Registration, photograph, size, or serial not found' USING ERRCODE='22023'; END IF;
  IF serial_row.used_at IS NOT NULL OR serial_row.certificate_id IS NOT NULL THEN RAISE EXCEPTION 'That serial number has already been used' USING ERRCODE='23505'; END IF;
  IF p_print_number < 1 OR p_edition_total < 1 OR p_print_number > p_edition_total OR p_edition_total <> size_row.edition_size THEN RAISE EXCEPTION 'Print number must be within the selected edition' USING ERRCODE='22023'; END IF;
  IF p_capture_year < 1800 OR p_capture_year > extract(year from now())::integer OR length(btrim(coalesce(p_order_number,'')))=0 OR length(btrim(coalesce(p_location,'')))=0 OR length(btrim(coalesce(p_technical_information,''))) < 2 OR length(btrim(coalesce(p_image_history,''))) < 2 THEN RAISE EXCEPTION 'Complete every certificate field' USING ERRCODE='22023'; END IF;
  INSERT INTO public.print_certificates(registration_id,image_id,size_id,serial_id,print_number,edition_total,order_number,location,capture_year,technical_information,image_history,purchaser_snapshot,image_snapshot,created_by)
  VALUES(reg.id,image_row.id,size_row.id,serial_row.id,p_print_number,p_edition_total,btrim(p_order_number),btrim(p_location),p_capture_year,btrim(p_technical_information),btrim(p_image_history),reg.collector_snapshot,jsonb_build_object('id',image_row.id,'title',image_row.title,'storage_path',image_row.storage_path)) RETURNING * INTO cert;
  UPDATE public.photo_serial_numbers SET used_at=now(),certificate_id=cert.id WHERE id=serial_row.id;
  RETURN to_jsonb(cert);
END; $$;

CREATE OR REPLACE FUNCTION public.admin_mark_print_certificate_printed(p_certificate_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  IF ((SELECT auth.jwt())->'app_metadata'->>'role') <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  UPDATE public.print_certificates SET status='printed',printed_at=coalesce(printed_at,now()) WHERE id=p_certificate_id AND status='draft'; RETURN FOUND;
END; $$;

REVOKE ALL ON FUNCTION public.admin_add_photo_serial(uuid,text), public.admin_create_print_certificate(uuid,uuid,uuid,text,integer,integer,text,text,integer,text,text), public.admin_mark_print_certificate_printed(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_add_photo_serial(uuid,text), public.admin_create_print_certificate(uuid,uuid,uuid,text,integer,integer,text,text,integer,text,text), public.admin_mark_print_certificate_printed(uuid) TO authenticated;
