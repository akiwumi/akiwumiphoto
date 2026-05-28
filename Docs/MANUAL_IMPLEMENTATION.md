# AKIWUMI PHOTO — MANUAL IMPLEMENTATION GUIDE

> This document contains every step you need to complete manually — Supabase setup, environment variables, storage buckets, authentication, and more. Follow each section in order.

---

## TABLE OF CONTENTS

1. [Create Your Supabase Project](#1-create-your-supabase-project)
2. [Get Your API Keys](#2-get-your-api-keys)
3. [Set Your Environment Variables](#3-set-your-environment-variables)
4. [Run the Database SQL](#4-run-the-database-sql)
5. [Set Up Row Level Security (RLS)](#5-set-up-row-level-security-rls)
6. [Create Storage Buckets](#6-create-storage-buckets)
7. [Set Storage Bucket Policies](#7-set-storage-bucket-policies)
8. [Set Up Admin Authentication](#8-set-up-admin-authentication)
9. [Seed Initial Page Content](#9-seed-initial-page-content)
10. [Vercel Deployment Environment Variables](#10-vercel-deployment-environment-variables)
11. [Checklist — Everything You Need To Do](#11-checklist--everything-you-need-to-do)

---

## 1. Create Your Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account)
2. Click **"New project"**
3. Fill in:
   - **Name:** `akiwumi-photo` (or anything you like)
   - **Database Password:** Create a strong password — **save this somewhere safe** (you'll need it later)
   - **Region:** Choose the one closest to you (e.g. US East, EU West)
4. Click **"Create new project"**
5. Wait about 1–2 minutes for Supabase to finish setting up

---

## 2. Get Your API Keys

Once your project is ready:

1. In the left sidebar, click **"Project Settings"** (the gear icon at the bottom)
2. Click **"API"** in the settings menu
3. You will see three values — copy all three:

| What it's called in Supabase | What it's called in your project |
|---|---|
| **Project URL** | `NEXT_PUBLIC_SUPABASE_URL` |
| **anon public** (under "Project API keys") | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| **service_role** (under "Project API keys") | `SUPABASE_SERVICE_ROLE_KEY` |

> **IMPORTANT:** The `service_role` key is secret — it bypasses all security rules. Never share it publicly or put it in any code that runs in the browser. It only goes in server-side code.

---

## 3. Set Your Environment Variables

Your environment variables file is located at:
```
akiwumi-photo/.env.local
```

Open that file and replace the placeholder values with your real keys:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- Replace `https://xxxxxxxxxxxxxxxxxxxx.supabase.co` with your actual **Project URL**
- Replace the `eyJ...` values with your actual **anon** and **service_role** keys
- Leave `NEXT_PUBLIC_SITE_URL` as `http://localhost:3000` for now (you'll update it when you deploy)

> **How to open `.env.local`:** In VS Code, press `Cmd+P`, type `.env.local`, and press Enter.

---

## 4. Run the Database SQL

This creates all the database tables your site needs.

1. In your Supabase project, click **"SQL Editor"** in the left sidebar
2. Click **"New query"**
3. Copy and paste the entire SQL block below into the editor
4. Click **"Run"** (the green button)

```sql
-- ============================================================
-- AKIWUMI PHOTO — DATABASE TABLES
-- Run this entire block in Supabase SQL Editor
-- ============================================================

-- Galleries table
-- Each row = one tile on the homepage carousel + one gallery page
CREATE TABLE IF NOT EXISTS galleries (
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

-- Gallery images table
-- Each row = one image inside a gallery
CREATE TABLE IF NOT EXISTS gallery_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id   uuid REFERENCES galleries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  title        text,
  description  text,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- Videos table
-- Each row = one card on the videography page
CREATE TABLE IF NOT EXISTS videos (
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

-- Page content table
-- Stores editable text for About, Prints, Splash, and Contact pages
CREATE TABLE IF NOT EXISTS page_content (
  page         text NOT NULL,
  key          text NOT NULL,
  value        text,
  PRIMARY KEY (page, key)
);

-- Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_galleries_updated_at
  BEFORE UPDATE ON galleries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON videos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

You should see a green **"Success"** message. If you see an error, check that you copied the full block.

---

## 5. Set Up Row Level Security (RLS)

Row Level Security controls who can read and write your data. Run this in a **new SQL query** (click "New query" again):

```sql
-- ============================================================
-- ROW LEVEL SECURITY POLICIES
-- Run this as a second query after the tables are created
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE galleries ENABLE ROW LEVEL SECURITY;
ALTER TABLE gallery_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_content ENABLE ROW LEVEL SECURITY;

-- ---- GALLERIES ----

-- Anyone on the internet can read published galleries (for the homepage + gallery pages)
CREATE POLICY "Public can read published galleries"
  ON galleries FOR SELECT
  USING (published = true);

-- Only logged-in admin can create, update, or delete galleries
CREATE POLICY "Admins can do everything with galleries"
  ON galleries FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---- GALLERY IMAGES ----

-- Anyone can read images that belong to a published gallery
CREATE POLICY "Public can read images of published galleries"
  ON gallery_images FOR SELECT
  USING (
    gallery_id IN (
      SELECT id FROM galleries WHERE published = true
    )
  );

-- Only logged-in admin can manage images
CREATE POLICY "Admins can do everything with gallery images"
  ON gallery_images FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---- VIDEOS ----

-- Anyone can read published videos
CREATE POLICY "Public can read published videos"
  ON videos FOR SELECT
  USING (published = true);

-- Only logged-in admin can manage videos
CREATE POLICY "Admins can do everything with videos"
  ON videos FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- ---- PAGE CONTENT ----

-- Anyone can read page content (About text, Prints info, etc.)
CREATE POLICY "Public can read page content"
  ON page_content FOR SELECT
  USING (true);

-- Only logged-in admin can edit page content
CREATE POLICY "Admins can do everything with page content"
  ON page_content FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
```

---

## 6. Create Storage Buckets

Storage buckets are where your images get uploaded and stored.

1. In the left sidebar, click **"Storage"**
2. Click **"New bucket"**
3. Create the following two buckets — one at a time:

### Bucket 1: `gallery-images`
- **Name:** `gallery-images`
- **Public bucket:** Toggle this **ON** (so your site can display the images)
- Click **"Save"**

### Bucket 2: `about-images`
- **Name:** `about-images`
- **Public bucket:** Toggle this **ON**
- Click **"Save"**

---

## 7. Set Storage Bucket Policies

Now set who can upload and delete files. Run this in a **new SQL query**:

```sql
-- ============================================================
-- STORAGE POLICIES
-- Run after creating the storage buckets
-- ============================================================

-- Allow anyone to view images in gallery-images bucket
CREATE POLICY "Public can view gallery images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'gallery-images');

-- Only logged-in admin can upload images to gallery-images
CREATE POLICY "Admins can upload gallery images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'gallery-images'
    AND auth.role() = 'authenticated'
  );

-- Only logged-in admin can delete gallery images
CREATE POLICY "Admins can delete gallery images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'gallery-images'
    AND auth.role() = 'authenticated'
  );

-- Allow anyone to view images in about-images bucket
CREATE POLICY "Public can view about images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'about-images');

-- Only logged-in admin can upload to about-images
CREATE POLICY "Admins can upload about images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'about-images'
    AND auth.role() = 'authenticated'
  );

-- Only logged-in admin can delete about images
CREATE POLICY "Admins can delete about images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'about-images'
    AND auth.role() = 'authenticated'
  );
```

---

## 8. Set Up Admin Authentication

This creates your admin login account.

1. In the left sidebar, click **"Authentication"**
2. Click **"Users"**
3. Click **"Add user"** → **"Create new user"**
4. Fill in:
   - **Email:** Your email address (e.g. `akiwumi@gmail.com`)
   - **Password:** A strong password — **save this!** This is what you'll use to log into `/admin`
5. Click **"Create user"**

> That's it — Supabase handles all the login logic. Your code will use this email and password to authenticate the admin.

---

## 9. Seed Initial Page Content

This inserts starter text into your database for the About, Prints, Splash, and Contact pages. You can edit all of this later through the CRM.

Run this in a **new SQL query**:

```sql
-- ============================================================
-- INITIAL PAGE CONTENT
-- Starter content — edit later via the CRM
-- ============================================================

INSERT INTO page_content (page, key, value) VALUES

-- Splash page
('splash', 'title', 'WELCOME TO AKIWUMI PHOTO'),
('splash', 'music_enabled', 'true'),
('splash', 'audio_file', ''),

-- About page
('about', 'bio', 'Enter your bio here. Tell your story as a photographer — your style, your influences, your vision.'),
('about', 'portrait_image', ''),

-- Prints page
('prints', 'headline', 'LIMITED EDITION PRINTS'),
('prints', 'small_size', '12×16"'),
('prints', 'small_edition', '10'),
('prints', 'small_price', ''),
('prints', 'medium_size', '20×24"'),
('prints', 'medium_edition', '10'),
('prints', 'medium_price', ''),
('prints', 'large_size', '30×40"'),
('prints', 'large_edition', '10'),
('prints', 'large_price', ''),
('prints', 'ultra_size', '48×60"+'),
('prints', 'ultra_edition', '1'),
('prints', 'ultra_price', ''),
('prints', 'paper_description', 'Fine art archival giclée, acid-free cotton rag, 310gsm minimum'),
('prints', 'certification_description', 'Each print hand-signed, numbered, and issued with an embossed Certificate of Authenticity'),

-- Contact page
('contact', 'subject_options', 'General Enquiry,Print Enquiry,Commission,Collaboration,Other')

ON CONFLICT (page, key) DO NOTHING;
```

---

## 10. Vercel Deployment Environment Variables

When you're ready to deploy your site live, you'll need to add your environment variables to Vercel.

1. Go to [https://vercel.com](https://vercel.com) and open your project
2. Click **"Settings"** → **"Environment Variables"**
3. Add each of these — one at a time — clicking **"Add"** after each:

| Variable Name | Value | Environment |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase Project URL | Production, Preview, Development |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key | Production, Preview, Development |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service_role key | Production, Preview, Development |
| `NEXT_PUBLIC_SITE_URL` | `https://yourdomain.com` | Production |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | Development |

> After adding environment variables in Vercel, you must **redeploy** for them to take effect. Click **"Deployments"** → find your latest deploy → click the three dots → **"Redeploy"**.

---

## 11. Checklist — Everything You Need To Do

Work through this list in order. Tick each item off as you complete it.

### Supabase Setup
- [ ] Create Supabase account at supabase.com
- [ ] Create new project named `akiwumi-photo`
- [ ] Copy Project URL → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`
- [ ] Copy anon key → paste into `.env.local` as `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] Copy service_role key → paste into `.env.local` as `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run **Section 4 SQL** (create tables) in SQL Editor
- [ ] Run **Section 5 SQL** (row level security) in SQL Editor
- [ ] Create `gallery-images` storage bucket (public ON)
- [ ] Create `about-images` storage bucket (public ON)
- [ ] Run **Section 7 SQL** (storage policies) in SQL Editor
- [ ] Create admin user in Authentication → Users
- [ ] Run **Section 9 SQL** (seed page content) in SQL Editor

### Local Development
- [ ] `.env.local` file has all 4 real values (not placeholder text)
- [ ] Run `npm install` in the `akiwumi-photo` folder (if not done already)
- [ ] Run `npm run dev` — site should open at `http://localhost:3000`

### Deployment (do this last)
- [ ] Add all environment variables in Vercel Settings
- [ ] Update `NEXT_PUBLIC_SITE_URL` to your live domain in Vercel
- [ ] Redeploy after adding environment variables

---

## Quick Reference — Where Things Live

| What | Where to find it |
|---|---|
| Your `.env.local` file | `akiwumi-photo/.env.local` |
| Supabase dashboard | [https://supabase.com/dashboard](https://supabase.com/dashboard) |
| SQL Editor | Supabase dashboard → SQL Editor (left sidebar) |
| Storage buckets | Supabase dashboard → Storage (left sidebar) |
| Admin users | Supabase dashboard → Authentication → Users |
| Your API keys | Supabase dashboard → Project Settings → API |

---

*Document version: 1.0 — 2026-05-28*
