-- Sub-galleries: named selections of photographs within a gallery.
--
-- A photograph can belong to several sub-galleries and always stays in its
-- gallery. On the site, a gallery's main view shows its sub-galleries
-- followed by the photographs that belong to none; each sub-gallery is a
-- filter on the same page (/gallery/<slug>?sub=<sub-slug>).

CREATE TABLE public.gallery_sections (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id     uuid NOT NULL REFERENCES public.galleries (id) ON DELETE CASCADE,
  title          text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 80),
  slug           text NOT NULL CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  -- Falls back to the first photograph when unset or deleted.
  cover_image_id uuid REFERENCES public.gallery_images (id) ON DELETE SET NULL,
  sort_order     integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gallery_id, slug)
);

CREATE INDEX gallery_sections_cover_image_id_idx ON public.gallery_sections (cover_image_id);

CREATE TRIGGER update_gallery_sections_updated_at
  BEFORE UPDATE ON public.gallery_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.gallery_section_images (
  section_id uuid NOT NULL REFERENCES public.gallery_sections (id) ON DELETE CASCADE,
  image_id   uuid NOT NULL REFERENCES public.gallery_images (id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (section_id, image_id)
);

CREATE INDEX gallery_section_images_image_id_idx ON public.gallery_section_images (image_id);

ALTER TABLE public.gallery_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gallery_section_images ENABLE ROW LEVEL SECURITY;

-- Visible wherever their gallery is: published galleries only.
CREATE POLICY "Public can read sub-galleries of published galleries" ON public.gallery_sections
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.galleries g WHERE g.id = gallery_sections.gallery_id AND g.published)
  );

CREATE POLICY "Public can read sub-gallery photos of published galleries" ON public.gallery_section_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.gallery_sections s
      JOIN public.galleries g ON g.id = s.gallery_id
      WHERE s.id = gallery_section_images.section_id AND g.published
    )
  );

CREATE POLICY "Admin full access" ON public.gallery_sections
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');

CREATE POLICY "Admin full access" ON public.gallery_section_images
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
