# AKIWUMI PHOTO — MASTER BUILD PLAN

---

## PROJECT OVERVIEW

**Site:** akiwumi.photo (or equivalent domain)
**Type:** Photography portfolio + e-commerce prints + videography showcase
**Design Language:** Bauhaus-inspired — geometric, minimal, functional brutalism
**Color System:** Black / White / Red
**Admin CRM:** Separate authenticated route for content management

---

## SITE ARCHITECTURE

```
/                       → Splash Page
/home                   → Home (gallery carousel hub)
/gallery/:slug          → Sub-gallery (tiled images + descriptions)
/videography            → Video gallery (modal playback)
/prints                 → Sales / Print editions page
/about                  → About page
/contact                → Contact page
/admin                  → CRM login (separate, unlisted link)
/admin/dashboard        → CRM dashboard (authenticated)
```

---

## PAGE-BY-PAGE SPECIFICATION

---

### 1. SPLASH PAGE (`/`)

**Purpose:** Brand entry point. Sets the tone. Forces attention.

**Layout:**
- Full viewport black background
- Title: `WELCOME TO AKIWUMI PHOTO` — centered, full-bleed brutalist type
- Font: Heavy grotesque / brutalist (e.g. Space Grotesk Black, Bebas Neue, or custom slab)
- Text fades in from black over 1.8s with slight scale grow (105% → 100%)
- Text dominates the screen — oversized, tracking wide, uppercase
- After 2.5s delay, a RED `ENTER` button fades in at center-bottom
- Button style: flat rectangle, red fill (#E8001C), white uppercase label, no border radius
- On click: full-screen blur transition outward, page fades to white, routes to `/home`

**Interactions:**
- No scroll. No nav. Single CTA.
- Music begins on ENTER click (ambient loop starts, persisted across pages)
- Transition: blur radial expand → white fade → home carousel arrives

---

### 2. HOME PAGE (`/home`)

**Purpose:** Gallery hub. Entry point to all photography sub-galleries.

**Data source:** The homepage carousel is driven **entirely by the CRM**. Every gallery created in the CRM automatically appears as a tile on the homepage. No code changes are needed to add, remove, or reorder galleries — it is all managed through the admin dashboard.

**Layout:**
- Full viewport. No scroll. Above the fold at all times.
- Horizontal carousel of tiled gallery cards — one tile per gallery, in the order set in the CRM
- Each tile: full-bleed cover image (set in CRM), gallery title overlay (bottom-left), Bauhaus geometric accent line
- Carousel controlled by arrow keys, swipe (mobile), or edge hover drag
- Active tile scales slightly (103%) with a white border flash
- Navigation bar: minimal top strip — `AKIWUMI PHOTO` wordmark left, `VIDEO / PRINTS / ABOUT / CONTACT` right, all caps, no decoration

**Carousel Tiles (Gallery Cards):**
- Square or 4:5 ratio tiles
- 3–4 visible simultaneously on desktop, 1.2 visible on mobile
- Hover: title text slides up, red accent line appears beneath
- Click: tile blurs outward → routes to `/gallery/[slug]` for that gallery
- If no galleries exist yet: homepage shows a placeholder "Coming Soon" tile

**Audio:** Ambient music continues (persistent player, hidden/minimal — small icon bottom-right)

---

### CRM → HOMEPAGE DATA FLOW

```
Admin creates gallery in CRM
  ↓
Gallery saved to database (title, slug, cover image, description, sort order)
  ↓
Homepage fetches all published galleries, ordered by sort_order
  ↓
Each gallery renders as one carousel tile on the homepage
  ↓
User clicks tile → routes to /gallery/[slug]
  ↓
Gallery page fetches all images for that gallery slug
  ↓
Images displayed in tiled carousel with titles and descriptions
```

**Rules:**
- Galleries marked `published: false` in CRM are hidden from the homepage (draft mode)
- Gallery order on homepage matches the drag-reorder sequence set in CRM
- Cover image defaults to the first uploaded image if not explicitly set
- Deleting a gallery in CRM removes it from the homepage immediately
- Slug is auto-generated from the title but editable — changing slug updates all links

---

### 3. SUB-GALLERY PAGE (`/gallery/[slug]`)

**Purpose:** Display a single gallery collection with individual image descriptions.

**Data source:** All content — title, description, images, captions — is created and managed in the CRM. The page slug in the URL matches the slug set in the CRM gallery record.

**Layout:**
- Full viewport. Above the fold. Carousel of tiled images.
- Header zone (top strip):
  - Gallery title — pulled from CRM, large brutalist type
  - Gallery description — pulled from CRM, 1–2 sentence caption, smaller weight
  - Breadcrumb: `HOME → [GALLERY NAME]`
- Image carousel below header:
  - Tiled grid carousel (2–3 columns on desktop, 1 on mobile)
  - Each image tile: image + image title + short description — all from CRM
  - Images displayed in the order set in the CRM (drag to reorder)
  - Click on image: opens fullscreen lightbox with description, prev/next navigation
- Return routes:
  - `← BACK TO GALLERIES` (returns to `/home` carousel)
  - Breadcrumb trail always visible

**Transitions:**
- Entry: slide-in from right with blur fade
- Exit to home: slide-out to left, home fades back in
- Lightbox open: image expands from tile with gaussian blur behind

---

### 4. VIDEOGRAPHY PAGE (`/videography`)

**Purpose:** Showcase video work. Cinematic feel within Bauhaus frame.

**Layout:**
- Full viewport carousel of video cards
- Each card: static thumbnail (16:9), video title (large), short description (1–2 lines)
- Red play icon centered on thumbnail
- Hover: thumbnail desaturates slightly, play icon scales up

**Modal Playback:**
- Click card: full-screen modal opens with black overlay (opacity 0.92)
- Video player centered, max 85vw × 85vh
- Video title + description displayed below player within modal
- Close: `✕` top-right, red, or press ESC
- Transition: modal scales in from card position with blur backdrop

---

### 5. PRINTS / SALES PAGE (`/prints`)

**Purpose:** Communicate edition value, quality, pricing, and scarcity.

**Layout:**
- Single viewport. Bauhaus grid layout. No scroll — carousel sections if needed.
- Header: `LIMITED EDITION PRINTS` — oversized type

**Print Tiers (displayed as cards or grid):**

| Size | Edition Run | Notes |
|---|---|---|
| Small (12×16") | 10 per image | Certificate of Authenticity included |
| Medium (20×24") | 10 per image | Certificate of Authenticity included |
| Large (30×40") | 10 per image | Certificate of Authenticity included |
| Ultra Large (48×60"+) | 1 per image | Single unique print — never reprinted |

**Content Sections:**
- **Paper & Materials:** Fine art archival giclée, acid-free cotton rag, 310gsm minimum
- **Print Quality:** Pigment ink, 100-year archival rating, museum standard
- **Certification:** Each print hand-signed, numbered (e.g. 3/10), embossed certificate issued
- **Scarcity:** Once an edition sells out — that size is permanently retired for that image
- **Ultra Large:** One print. One owner. No exceptions.
- **Pricing table:** Per size — editable via CRM
- **CTA:** `ENQUIRE ABOUT A PRINT` → routes to `/contact` with print pre-selected

---

### 6. ABOUT PAGE (`/about`)

**Layout:**
- Full viewport. Two-column Bauhaus grid.
- Left: large portrait or abstract photographer image
- Right: bio text — brutalist heading, body copy, red horizontal rule divider
- Minimal. Strong typography hierarchy.

---

### 7. CONTACT PAGE (`/contact`)

**Layout:**
- Full viewport. Centered form layout.
- Fields: Name / Email / Subject (dropdown includes "Print Enquiry") / Message
- Submit button: red, full-width, `SEND MESSAGE`
- Social links row (Instagram, etc.) — icon only, monochrome
- Form submission: backend POST or form service (Formspree / Resend / Supabase)

---

### 8. ADMIN CRM (`/admin`)

**Access:** Direct URL only — not linked from public site. Admin credentials only.

**Login Screen:**
- Minimal black page, centered form: Username + Password
- Red `LOGIN` button
- Session-based auth (JWT or cookie-backed)

**CRM Dashboard (`/admin/dashboard`):**

**Sections:**

---

**Galleries** ← this is the source of truth for the homepage

Each gallery created here becomes one tile on the homepage carousel automatically.

Fields per gallery:
- **Title** — displayed on homepage tile and gallery page heading
- **Slug** — auto-generated from title, editable (e.g. `street-portraits`) — forms the URL `/gallery/street-portraits`
- **Description** — displayed at the top of the gallery page
- **Cover image** — the image shown on the homepage tile (defaults to first uploaded image)
- **Published toggle** — `ON` = visible on homepage / `OFF` = draft, hidden from public
- **Sort order** — drag galleries up/down in the list to reorder their position on the homepage carousel

Images within a gallery:
- Upload images via drag & drop or file picker (including mobile camera)
- Per-image fields: **Title** and **Description** (displayed in the carousel tile and lightbox)
- Drag to reorder images within the gallery
- Delete individual images
- Set any image as the gallery cover image

Actions: **Create gallery**, **Edit gallery**, **Publish / Unpublish**, **Delete gallery**

> **Important:** Publishing a gallery immediately adds it to the homepage carousel. Unpublishing removes it without deleting it — content is preserved for later.

---

**Video Gallery**

Each video entry created here becomes one card in the `/videography` carousel.

Fields per video:
- **Title** — displayed on the video card and inside the modal
- **Description** — displayed on the video card (truncated) and in full inside the modal
- **Video URL** — YouTube, Vimeo, or direct file URL
- **Thumbnail** — custom thumbnail image (if not using auto-extracted from video URL)
- **Published toggle** — show/hide from public page
- **Sort order** — drag to reorder position in the carousel

Actions: **Add video**, **Edit video**, **Publish / Unpublish**, **Delete video**

---

**Pages (About / Prints / Contact)**
- Rich text editor for About bio content
- Image upload for About page portrait
- Edit print tier names, sizes, edition counts, and pricing
- Edit print quality / paper / certification copy
- Edit contact form subject dropdown options

---

**Splash Page**
- Edit title text
- Enable / disable ambient music
- Upload ambient audio file (MP3 / OGG)

---

**Settings**
- Change admin password
- Site title / meta description / SEO settings

---

## MOBILE-FIRST REQUIREMENTS

The site is built mobile-first — all layouts, interactions, and performance targets must pass on mobile before desktop is considered complete. "Above the fold" means within the visible viewport on a 390px-wide device (iPhone 14 baseline).

---

### Navigation — Mobile

- Desktop nav collapses to a hamburger icon (`≡`) on screens `< 768px`
- Hamburger positioned top-right, 44×44px touch target, white on black nav bar
- Tap opens a full-screen slide-down overlay menu (black BG, white links stacked vertically, large type)
- Active page link: red color
- Close: tap `✕` at top-right, or tap outside, or swipe up
- Music toggle icon (♪) remains fixed bottom-right at all breakpoints — 44×44px tap target

---

### Touch & Gesture Interactions

| Interaction | Behaviour |
|---|---|
| Carousel swipe | Horizontal swipe to advance/retreat tiles — momentum-based with snap |
| Lightbox swipe | Horizontal swipe left/right to navigate between images |
| Lightbox close | Swipe down to dismiss (in addition to ✕ button) |
| Video modal close | Swipe down to dismiss |
| Splash ENTER | Full tap area — button minimum 44×44px, centred comfortably in viewport |
| Pinch-to-zoom | Disabled on carousels; enabled inside lightbox for image inspection |

All tap targets: minimum **44×44px** per Apple/Google accessibility guidelines. Adequate spacing between interactive elements to prevent mis-taps.

---

### Carousel — Mobile Specifics

- Arrow buttons (`◄ ►`) hidden on mobile — gesture-only navigation
- Dot pagination visible and tappable (each dot: 24×24px tap target, 8px gap)
- Partial next tile always visible (peek: ~15% of next tile) to signal scrollability
- Tiles snap to centre on mobile
- No hover states on mobile — tap activates directly

---

### Splash Page — Mobile

- Title scales fluidly: `clamp(2rem, 10vw, 9rem)` — fills screen width on all phones
- Line breaks forced at natural word boundaries (no overflow)
- ENTER button: full-width on mobile (calc(100% - 48px)), centred, minimum height 52px
- Tap ENTER: same blur/fade transition as desktop

---

### Sub-Gallery — Mobile

- Header compresses: gallery title wraps to 2 lines max, description truncates to 2 lines with expand option
- Image carousel: 1 tile fully visible, 15% of next tile peeking right
- Image tiles: full viewport width (100vw - 40px), 4:5 ratio
- Lightbox: full-screen takeover (100vw × 100vh), image fills with object-fit: contain
- Caption text scrollable within lightbox if long

---

### Videography — Mobile

- Video cards: full width stacked carousel (1 card visible + peek)
- Thumbnail: 16:9, full card width
- Video modal: full-screen (100vw × 100vh), native video controls
- Modal close: swipe down or ✕ top-right (44×44px)

---

### Prints Page — Mobile

- 4-card grid → horizontal swipe carousel (1 card + peek visible)
- Info sections (paper quality, certification): stacked vertically below carousel
- Enquire CTA: full-width sticky button at bottom of page (above safe area)

---

### About Page — Mobile

- Two-column layout → single column: portrait image full width at top, bio text below
- Portrait: 100vw, 50vh, object-fit: cover

---

### Contact Page — Mobile

- Form: full width, inputs 48px height for easy tapping
- Keyboard: numeric keyboard for phone fields (if added), email keyboard for email field
- Form submits without page reload (AJAX) — no jarring navigation on mobile

---

### Performance — Mobile Targets

| Metric | Target |
|---|---|
| Largest Contentful Paint (LCP) | < 2.5s on 4G |
| First Input Delay (FID) | < 100ms |
| Cumulative Layout Shift (CLS) | < 0.1 |
| Image loading | Lazy-loaded, Next.js `<Image>` with `sizes` prop set per breakpoint |
| Video thumbnails | Lazy-loaded, video itself only loads on modal open |
| Fonts | Subset + `font-display: swap` to prevent FOUT blocking render |
| Ambient audio | Does NOT auto-load on mobile — user tap required (browser policy) |

---

### Safe Area Handling (iOS Notch / Dynamic Island)

```css
/* Applied to fixed bottom elements (music toggle, sticky CTAs) */
padding-bottom: env(safe-area-inset-bottom);
padding-top: env(safe-area-inset-top);   /* nav bar */
```

- Nav bar respects `safe-area-inset-top`
- Music icon and sticky CTAs respect `safe-area-inset-bottom`
- Full-screen modals use `100dvh` (dynamic viewport height) not `100vh` to avoid iOS address bar overlap

---

## DATABASE SCHEMA

The following tables drive the CRM → public site data flow.

```sql
-- Galleries table — each row = one homepage tile + one gallery page
CREATE TABLE galleries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  slug         text NOT NULL UNIQUE,        -- used in URL: /gallery/[slug]
  description  text,
  cover_image  text,                        -- storage path or URL; defaults to first image
  sort_order   integer NOT NULL DEFAULT 0,  -- drag-reorder in CRM sets this
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Images table — each row = one image tile within a gallery
CREATE TABLE gallery_images (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id   uuid REFERENCES galleries(id) ON DELETE CASCADE,
  storage_path text NOT NULL,               -- Supabase Storage path
  title        text,
  description  text,
  sort_order   integer NOT NULL DEFAULT 0,  -- drag-reorder within gallery
  created_at   timestamptz DEFAULT now()
);

-- Videos table — each row = one card on the videography page
CREATE TABLE videos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  description  text,
  video_url    text NOT NULL,               -- YouTube/Vimeo URL or storage path
  thumbnail    text,
  sort_order   integer NOT NULL DEFAULT 0,
  published    boolean NOT NULL DEFAULT false,
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Page content — key/value store for editable text on static pages
CREATE TABLE page_content (
  page         text NOT NULL,               -- 'about', 'prints', 'splash', 'contact'
  key          text NOT NULL,               -- 'bio', 'portrait_image', 'small_price', etc.
  value        text,
  PRIMARY KEY (page, key)
);
```

**Homepage carousel query** (what the site runs on every page load):
```sql
SELECT id, title, slug, description, cover_image, sort_order
FROM galleries
WHERE published = true
ORDER BY sort_order ASC;
```

**Gallery page query** (run when user clicks a tile):
```sql
-- Gallery metadata
SELECT title, description FROM galleries WHERE slug = $1 AND published = true;

-- Images for that gallery
SELECT storage_path, title, description, sort_order
FROM gallery_images
WHERE gallery_id = (SELECT id FROM galleries WHERE slug = $1)
ORDER BY sort_order ASC;
```

---

## TECHNICAL STACK (RECOMMENDED)

| Layer | Choice | Rationale |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR, routing, API routes for CRM backend |
| Styling | Tailwind CSS + CSS custom properties | Rapid Bauhaus grid, animation control |
| Animations | Framer Motion | Blur transitions, carousel physics, modal scale |
| CMS/CRM Backend | Supabase (PostgreSQL + Storage + Auth) | Images, content, admin auth, free tier |
| Video | YouTube/Vimeo embed or Supabase Storage | Modal player |
| Audio | HTML5 Audio API (persisted via React context) | Ambient loop |
| Carousel | Embla Carousel or custom Framer Motion | Full-viewport control |
| Image Optimization | Next.js Image component + Supabase CDN | |
| Deployment | Vercel | Zero-config Next.js deploy |
| Form | Resend or Formspree | Contact form delivery |

---

## BUILD PHASES

### Phase 1 — Foundation
- [ ] Next.js project scaffold
- [ ] Tailwind + design tokens (colors, fonts, spacing)
- [ ] Supabase project: create tables (`galleries`, `gallery_images`, `videos`, `page_content`), storage buckets, auth
- [ ] Global layout shell: nav, music player context
- [ ] Splash page + ENTER transition

### Phase 2 — CRM Core (build before public pages)
> CRM is built first so all public pages pull real data from day one — no placeholder data
- [ ] Admin login + Supabase auth guard (`/admin` route protected)
- [ ] Gallery manager: create / edit / delete galleries, set title, slug, description, published toggle, sort order
- [ ] Image uploader: drag & drop images into a gallery, set per-image title + description, reorder, set cover image
- [ ] Gallery publish/unpublish toggle

### Phase 3 — Public Gallery Pages (now wired to live CRM data)
- [ ] Home carousel — fetches published galleries from Supabase, ordered by sort_order
- [ ] Each tile links to `/gallery/[slug]`
- [ ] Sub-gallery page `/gallery/[slug]` — fetches gallery + images from Supabase by slug
- [ ] Lightbox — full image with title and description
- [ ] Empty state: homepage shows "Coming Soon" tile when no galleries are published

### Phase 4 — Remaining Public Pages + CRM Extensions
- [ ] About page (content from `page_content` table)
- [ ] Contact page + form submission
- [ ] Videography carousel + modal player
- [ ] Video CRM: add/edit/delete/reorder/publish videos
- [ ] Prints/Sales page with full content
- [ ] Page content editors in CRM (About, Prints, Splash, Contact)
- [ ] Image upload for About portrait

### Phase 5 — Polish
- [ ] All blur/transition animations
- [ ] Ambient music integration
- [ ] SEO metadata
- [ ] Performance audit (Core Web Vitals)
- [ ] Deployment to Vercel

---

## CONTENT REQUIREMENTS (TO PROVIDE)

- [ ] Photography images (organized by gallery/collection)
- [ ] Gallery names + descriptions
- [ ] Per-image captions
- [ ] Video files or links + titles + descriptions
- [ ] Bio text + portrait
- [ ] Print pricing
- [ ] Ambient audio file
- [ ] Admin login credentials
- [ ] Domain / hosting preference

---

*Document version: 1.1 — 2026-05-27 (mobile-first requirements added)*
