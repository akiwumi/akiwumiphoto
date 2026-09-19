-- Let a verified collector update only their own registered details.
GRANT UPDATE (first_name, last_name, phone, address_line1, address_line2, city, region, postcode, country_code)
  ON public.collectors TO authenticated;

CREATE POLICY "Collectors can update their own record"
  ON public.collectors FOR UPDATE TO authenticated
  USING (auth_user_id = (SELECT auth.uid()) AND email_verified)
  WITH CHECK (auth_user_id = (SELECT auth.uid()) AND email_verified);

