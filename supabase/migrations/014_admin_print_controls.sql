CREATE TABLE public.print_size_exclusions (
  image_id uuid NOT NULL REFERENCES public.gallery_images(id) ON DELETE CASCADE,
  size_id uuid NOT NULL REFERENCES public.print_sizes(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (image_id, size_id)
);
ALTER TABLE public.print_size_exclusions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read size exclusions" ON public.print_size_exclusions FOR SELECT USING (true);
CREATE POLICY "Admin manages size exclusions" ON public.print_size_exclusions FOR ALL TO authenticated USING (((SELECT auth.jwt())->'app_metadata'->>'role')='admin') WITH CHECK (((SELECT auth.jwt())->'app_metadata'->>'role')='admin');

CREATE OR REPLACE FUNCTION public.admin_reset_image_sales(p_image_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ BEGIN
  IF ((SELECT auth.jwt())->'app_metadata'->>'role') <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  DELETE FROM public.print_sales WHERE image_id=p_image_id; RETURN true;
END; $$;
CREATE OR REPLACE FUNCTION public.admin_reset_purchases(p_order_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE n integer; BEGIN
  IF ((SELECT auth.jwt())->'app_metadata'->>'role') <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  DELETE FROM public.print_orders WHERE (p_order_id IS NULL OR id=p_order_id); GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;
CREATE OR REPLACE FUNCTION public.admin_reset_registrations(p_registration_id uuid DEFAULT NULL)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$ DECLARE n integer; BEGIN
  IF ((SELECT auth.jwt())->'app_metadata'->>'role') <> 'admin' THEN RAISE EXCEPTION 'Admin required' USING ERRCODE='42501'; END IF;
  UPDATE public.photo_serial_numbers SET used_at=NULL, certificate_id=NULL WHERE certificate_id IN (SELECT id FROM public.print_certificates WHERE (p_registration_id IS NULL OR registration_id=p_registration_id));
  DELETE FROM public.print_certificates WHERE (p_registration_id IS NULL OR registration_id=p_registration_id);
  DELETE FROM public.purchase_messages WHERE (p_registration_id IS NULL OR id=p_registration_id); GET DIAGNOSTICS n = ROW_COUNT; RETURN n;
END; $$;
REVOKE ALL ON FUNCTION public.admin_reset_image_sales(uuid), public.admin_reset_purchases(uuid), public.admin_reset_registrations(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_reset_image_sales(uuid), public.admin_reset_purchases(uuid), public.admin_reset_registrations(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.reject_excluded_print_sizes()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM jsonb_array_elements(NEW.lines) AS line JOIN public.print_size_exclusions e ON e.image_id=(line->>'image_id')::uuid AND e.size_id=(line->>'size_id')::uuid) THEN
    RAISE EXCEPTION 'That print size is not offered for this photograph' USING ERRCODE='22023';
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS reject_excluded_print_sizes_trigger ON public.print_orders;
CREATE TRIGGER reject_excluded_print_sizes_trigger BEFORE INSERT ON public.print_orders FOR EACH ROW EXECUTE FUNCTION public.reject_excluded_print_sizes();
