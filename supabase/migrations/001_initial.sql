-- Galleries table
CREATE TABLE galleries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  slug         text NOT NULL UNIQUE,
  description  text,
  cover_image  text,
  sort_order   integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Images table
CREATE TABLE gallery_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id   uuid REFERENCES galleries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  title        text,
  description  text,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Videos table
CREATE TABLE videos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  video_url    text NOT NULL,
  thumbnail    text,
  sort_order   integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Page content key-value store
CREATE TABLE page_content (
  page         text NOT NULL,
  key          text NOT NULL,
  value        text,
  PRIMARY KEY (page, key)
);

-- Seed default page content
INSERT INTO page_content (page, key, value) VALUES
  ('splash', 'title', 'WELCOME TO AKIWUMI PHOTO'),
  ('splash', 'music_enabled', 'true'),
  ('about', 'bio', 'Bio text goes here.'),
  ('prints', 'small_price', 'POA'),
  ('prints', 'medium_price', 'POA'),
  ('prints', 'large_price', 'POA'),
  ('prints', 'ultra_price', 'POA');

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Enable RLS
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- Public read access for published content
CREATE POLICY "Public can read published galleries"
  ON galleries FOR SELECT
  USING (published = true);

CREATE POLICY "Public can read gallery images"
  ON gallery_images FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM galleries
      WHERE galleries.id = gallery_images.gallery_id
      AND galleries.published = true
    )
  );

CREATE POLICY "Public can read published videos"
  ON videos FOR SELECT
  USING (published = true);

CREATE POLICY "Public can read page content"
  ON page_content FOR SELECT
  USING (true);

-- Service role has full access (admin CRM uses service role key)
