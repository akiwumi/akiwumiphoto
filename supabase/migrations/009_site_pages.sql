-- Pages the admin creates: served at /<slug> once published, optionally
-- linked from the menu and footer in nav_order. Built-in routes (about,
-- prints, ...) take precedence over a slug, and the admin refuses them.

CREATE TABLE public.site_pages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  slug            text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND char_length(slug) <= 80),
  intro           text NOT NULL DEFAULT '',
  -- Light formatting: ## headings, - lists, > quotes, **bold**, *italic*, [links](/path).
  body            text NOT NULL DEFAULT '',
  -- Public URL in the photography bucket.
  cover_image     text,
  seo_description text,
  published       boolean NOT NULL DEFAULT false,
  show_in_nav     boolean NOT NULL DEFAULT false,
  nav_order       integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER update_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read published pages" ON public.site_pages
  FOR SELECT USING (published);

CREATE POLICY "Admin full access" ON public.site_pages
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
