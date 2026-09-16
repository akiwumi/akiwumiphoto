-- Created pages are built from content blocks (text, images, photo grids,
-- quotes...) and can have sub pages, served at /<parent>/<slug>.
--
-- blocks is a JSON array validated by lib/page-blocks.ts. Nesting is one
-- level deep: the trigger refuses a sub page of a sub page.

ALTER TABLE public.site_pages DROP COLUMN body;
ALTER TABLE public.site_pages ADD COLUMN blocks jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(blocks) = 'array');
-- Width and height of the cover, so it reserves its space before loading.
ALTER TABLE public.site_pages ADD COLUMN cover_width integer;
ALTER TABLE public.site_pages ADD COLUMN cover_height integer;
ALTER TABLE public.site_pages ADD COLUMN parent_id uuid REFERENCES public.site_pages (id) ON DELETE CASCADE;
ALTER TABLE public.site_pages ADD CONSTRAINT site_pages_not_own_parent CHECK (parent_id IS NULL OR parent_id <> id);

-- Addresses are unique among siblings: /about-us and /workshops/about-us can coexist.
ALTER TABLE public.site_pages DROP CONSTRAINT site_pages_slug_key;
ALTER TABLE public.site_pages ADD CONSTRAINT site_pages_parent_slug_key UNIQUE NULLS NOT DISTINCT (parent_id, slug);

CREATE INDEX site_pages_parent_id_idx ON public.site_pages (parent_id);

CREATE FUNCTION public.site_pages_one_level()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.parent_id IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.site_pages p WHERE p.id = NEW.parent_id AND p.parent_id IS NOT NULL) THEN
      RAISE EXCEPTION 'A sub page cannot have sub pages of its own';
    END IF;
    IF EXISTS (SELECT 1 FROM public.site_pages c WHERE c.parent_id = NEW.id) THEN
      RAISE EXCEPTION 'A page with sub pages cannot become a sub page';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER site_pages_one_level
  BEFORE INSERT OR UPDATE OF parent_id ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.site_pages_one_level();

-- Trigger functions are not callable directly (as in restrict_trigger_functions).
REVOKE EXECUTE ON FUNCTION public.site_pages_one_level() FROM PUBLIC, anon, authenticated;
