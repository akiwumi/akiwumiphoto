-- Site modals: announcements that pop up on chosen pages and stay readable
-- on the News page after visitors dismiss them.
--
-- pages holds page keys ('all', 'landing', 'galleries', 'gallery',
-- 'videography', 'prints', 'about', 'contact', 'basket', 'news'); see
-- lib/site-modals.ts. At most three modals show on any one page, one after
-- another; the admin refuses to activate a fourth on the same page.

CREATE TABLE public.site_modals (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title              text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 120),
  body               text NOT NULL DEFAULT '',
  cta_label          text,
  cta_url            text,
  pages              text[] NOT NULL DEFAULT '{all}',
  -- Seconds after the page loads before the modal opens.
  delay_seconds      integer NOT NULL DEFAULT 2 CHECK (delay_seconds BETWEEN 0 AND 600),
  -- Closes by itself after this many seconds; null stays open until dismissed.
  auto_close_seconds integer CHECK (auto_close_seconds IS NULL OR auto_close_seconds BETWEEN 3 AND 600),
  frequency          text NOT NULL DEFAULT 'once_per_session'
                     CHECK (frequency IN ('every_view', 'once_per_session', 'once')),
  starts_at          timestamptz,
  ends_at            timestamptz,
  active             boolean NOT NULL DEFAULT false,
  show_on_news       boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CHECK (ends_at IS NULL OR starts_at IS NULL OR ends_at > starts_at)
);

CREATE TRIGGER update_site_modals_updated_at
  BEFORE UPDATE ON public.site_modals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.site_modals ENABLE ROW LEVEL SECURITY;

-- Drafts (neither popping up nor on the News page) stay private.
CREATE POLICY "Public can read live modals and news" ON public.site_modals
  FOR SELECT USING (active OR show_on_news);

CREATE POLICY "Admin full access" ON public.site_modals
  FOR ALL TO authenticated
  USING (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin')
  WITH CHECK (((SELECT auth.jwt()) -> 'app_metadata' ->> 'role') = 'admin');
