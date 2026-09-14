-- Content writes were granted to every authenticated user. Since collector
-- registration (002), every collector who verifies their email holds an
-- authenticated session, so any member of the public could register a print
-- and then edit or delete galleries, videos, page content and stored images.
--
-- Writes now require the admin role in the user's app_metadata. Only the
-- service role can set app_metadata, so a user cannot grant it to themselves.
-- The site owner's account is granted it outside this migration, by email:
--
--   UPDATE auth.users
--   SET raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'
--   WHERE email = '<admin email>';
--
-- The role is read from the JWT, so it applies from the next sign-in.
--
-- Public read policies are untouched. The duplicate write policies below
-- ("Auth full access" alongside "Admins can do everything with ...") were
-- created outside the repo's migrations; both are dropped.

-- Tables ---------------------------------------------------------------------

DROP POLICY IF EXISTS "Admins can do everything with galleries" ON public.galleries;
DROP POLICY IF EXISTS "Auth full access" ON public.galleries;
CREATE POLICY "Admin full access" ON public.galleries
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can do everything with gallery images" ON public.gallery_images;
DROP POLICY IF EXISTS "Auth full access" ON public.gallery_images;
CREATE POLICY "Admin full access" ON public.gallery_images
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can do everything with videos" ON public.videos;
DROP POLICY IF EXISTS "Auth full access" ON public.videos;
CREATE POLICY "Admin full access" ON public.videos
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

DROP POLICY IF EXISTS "Admins can do everything with page content" ON public.page_content;
DROP POLICY IF EXISTS "Auth full access" ON public.page_content;
CREATE POLICY "Admin full access" ON public.page_content
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

-- Storage --------------------------------------------------------------------
-- Public viewing of all three buckets stays as it is.

DROP POLICY IF EXISTS "Authenticated full access on gallery-images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete gallery images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload about images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete about images" ON storage.objects;
DROP POLICY IF EXISTS "Auth upload" ON storage.objects;
DROP POLICY IF EXISTS "Auth delete" ON storage.objects;

CREATE POLICY "Admin can upload site images" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id IN ('gallery-images', 'photography', 'about-images')
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can update site images" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id IN ('gallery-images', 'photography', 'about-images')
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  )
  WITH CHECK (
    bucket_id IN ('gallery-images', 'photography', 'about-images')
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );

CREATE POLICY "Admin can delete site images" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id IN ('gallery-images', 'photography', 'about-images')
    AND ((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin'
  );
