CREATE TABLE public.serial_number_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id uuid NOT NULL UNIQUE REFERENCES public.print_certificates(id) ON DELETE CASCADE,
  requested_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  serial_number char(6),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

CREATE INDEX serial_number_requests_user_idx ON public.serial_number_requests(requested_by, requested_at DESC);
ALTER TABLE public.serial_number_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.serial_number_requests FROM anon, authenticated;
GRANT SELECT, INSERT ON public.serial_number_requests TO authenticated;
GRANT ALL ON public.serial_number_requests TO service_role;

CREATE POLICY "Collectors can view their serial requests"
  ON public.serial_number_requests FOR SELECT TO authenticated
  USING (
    requested_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.print_certificates pc
      JOIN public.purchase_messages pm ON pm.id = pc.registration_id
      JOIN public.collectors c ON c.id = pm.collector_id
      WHERE pc.id = serial_number_requests.certificate_id
        AND c.auth_user_id = (SELECT auth.uid())
        AND c.email_verified = true
    )
  );

CREATE POLICY "Collectors can request their serial number"
  ON public.serial_number_requests FOR INSERT TO authenticated
  WITH CHECK (
    requested_by = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.print_certificates pc
      JOIN public.purchase_messages pm ON pm.id = pc.registration_id
      JOIN public.collectors c ON c.id = pm.collector_id
      WHERE pc.id = serial_number_requests.certificate_id
        AND c.auth_user_id = (SELECT auth.uid())
        AND c.email_verified = true
    )
  );

CREATE POLICY "Admins can manage serial requests"
  ON public.serial_number_requests FOR ALL TO authenticated
  USING (((SELECT auth.jwt())->'app_metadata'->>'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt())->'app_metadata'->>'role') = 'admin');
