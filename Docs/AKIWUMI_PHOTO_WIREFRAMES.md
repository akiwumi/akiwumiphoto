# AKIWUMI PHOTO — WIREFRAMES

---

## GLOBAL SHELL

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │  ← Nav (hidden on splash)
└──────────────────────────────────────────────────────────────────┘
│                                                                  │
│                        PAGE CONTENT                              │
│                        (full viewport)                           │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

- Nav height: ~48px. Transparent over content. Black on scroll or light pages.
- Music icon (♪): bottom-right, fixed, 32px. Toggle ambient music on/off.
- No footer on most pages. Contact page only.

---

## SPLASH PAGE (`/`)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                                                                  │
│                                                                  │
│          W E L C O M E   T O   A K I W U M I   P H O T O        │
│                                                                  │
│                                                                  │
│                                                                  │
│                          [ ENTER ]                               │
│                                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  BG: #000000
  TITLE: white, brutalist font, ~8–12vw, center, tracking: 0.3em
  ENTER: #E8001C button, white label, ~180px wide, appears after 2.5s delay
```

**Animation sequence:**
1. Page loads → black
2. 0.4s → title fades in + scales from 105% to 100%
3. 2.5s → ENTER button fades in from below (translateY 20px → 0)
4. Click ENTER → blur radial expands from button outward → white fade → /home

---

## HOME PAGE (`/home`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ◄  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────┐  ►        │
│      │         │  │         │  │         │  │     │            │
│      │  [img]  │  │  [img]  │  │  [img]  │  │[par │            │
│      │         │  │         │  │         │  │tial]│            │
│      │         │  │         │  │         │  │     │            │
│      ├─────────┤  ├─────────┤  ├─────────┤  └─────┘            │
│      │GALLERY 1│  │GALLERY 2│  │GALLERY 3│                      │
│      │  title  │  │  title  │  │  title  │                      │
│      └─────────┘  └─────────┘  └─────────┘                      │
│                                                                  │
│                      ● ○ ○ ○ ○                                   │  ← dot pagination
└──────────────────────────────────────────────────────────────────┘
```

- Tiles: ~280×350px desktop, square on mobile
- Partial 4th tile visible to signal scroll/drag
- Hover state: red underline accent on title, slight scale
- Arrow buttons: minimal `◄ ►`, white, positioned mid-height outside carousel
- Dot pagination: centered below carousel, red active dot

---

## SUB-GALLERY PAGE (`/gallery/:slug`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │
├──────────────────────────────────────────────────────────────────┤
│  ← HOME  /  STREET PORTRAITS                                     │  ← breadcrumb
│                                                                  │
│  STREET PORTRAITS                                                │  ← gallery title
│  Documentary work shot across Lagos, 2022–2024.                  │  ← description
│  ───────────────────────────────────────────                     │  ← red rule
│                                                                  │
│   ◄  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐  ►          │
│      │[img] │ │[img] │ │[img] │ │[img] │ │[img] │             │
│      │      │ │      │ │      │ │      │ │      │             │
│      ├──────┤ ├──────┤ ├──────┤ ├──────┤ ├──────┤             │
│      │Title │ │Title │ │Title │ │Title │ │Title │             │
│      │desc  │ │desc  │ │desc  │ │desc  │ │desc  │             │
│      └──────┘ └──────┘ └──────┘ └──────┘ └──────┘             │
│                                                                  │
│                      ● ○ ○ ○ ○                                   │
└──────────────────────────────────────────────────────────────────┘
```

**Lightbox (image click):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [blurred gallery behind]                                     ✕  │
│                                                                  │
│              ◄  ┌────────────────────┐  ►                       │
│                 │                    │                           │
│                 │     [image]        │                           │
│                 │                    │                           │
│                 └────────────────────┘                           │
│                   Image Title                                    │
│                   Image description text goes here.              │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  BG overlay: rgba(0,0,0,0.92) + backdrop-filter: blur(12px)
  ✕: top-right, red, 24px
  ◄ ►: white arrows, vertically centered on image
```

---

## VIDEOGRAPHY PAGE (`/videography`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  VIDEOGRAPHY                                                     │
│  ─────────────────────────────────────────────────               │
│                                                                  │
│   ◄  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  ► │
│      │               │  │               │  │               │    │
│      │  [thumbnail]  │  │  [thumbnail]  │  │  [thumbnail]  │    │
│      │      ▶        │  │      ▶        │  │      ▶        │    │
│      │               │  │               │  │               │    │
│      ├───────────────┤  ├───────────────┤  ├───────────────┤    │
│      │ VIDEO TITLE   │  │ VIDEO TITLE   │  │ VIDEO TITLE   │    │
│      │ Short desc.   │  │ Short desc.   │  │ Short desc.   │    │
│      └───────────────┘  └───────────────┘  └───────────────┘    │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Video Modal (card click):**
```
┌──────────────────────────────────────────────────────────────────┐
│ [blurred page behind]                                        ✕  │
│                                                                  │
│         ┌──────────────────────────────────────┐                │
│         │                                      │                │
│         │         VIDEO PLAYER                 │                │
│         │         (16:9, controls)             │                │
│         │                                      │                │
│         └──────────────────────────────────────┘                │
│                  VIDEO TITLE                                     │
│                  Full description text here.                     │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  Modal: max 85vw × 85vh, centered
  Overlay: rgba(0,0,0,0.92) + blur(16px)
```

---

## PRINTS / SALES PAGE (`/prints`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LIMITED EDITION PRINTS                                          │
│  ─────────────────────────────────────                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │   │
│  │  │  SMALL   │  │  MEDIUM  │  │  LARGE   │  │  ULTRA   │ │   │
│  │  │ 12 × 16" │  │ 20 × 24" │  │ 30 × 40" │  │ 48×60"+  │ │   │
│  │  │          │  │          │  │          │  │          │ │   │
│  │  │ Edition  │  │ Edition  │  │ Edition  │  │ UNIQUE   │ │   │
│  │  │ of 10    │  │ of 10    │  │ of 10    │  │ 1 PRINT  │ │   │
│  │  │          │  │          │  │          │  │  ONLY    │ │   │
│  │  │  £XXX    │  │  £XXX    │  │  £XXX    │  │  £XXX    │ │   │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌────────────────────┐  ┌────────────────────┐                 │
│  │  PAPER & QUALITY   │  │   CERTIFICATION    │                 │
│  │  Archival giclée   │  │  Hand-signed       │                 │
│  │  Cotton rag 310gsm │  │  Numbered X/10     │                 │
│  │  100-yr pigment    │  │  Embossed cert.    │                 │
│  └────────────────────┘  └────────────────────┘                 │
│                                                                  │
│              [ ENQUIRE ABOUT A PRINT → ]                         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ABOUT PAGE (`/about`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐  ┌──────────────────────────────────┐ │
│  │                      │  │  ABOUT                           │ │
│  │                      │  │  ──────────────────────────      │ │
│  │    [PORTRAIT /       │  │                                  │ │
│  │     ABSTRACT IMAGE]  │  │  Bio paragraph one.              │ │
│  │                      │  │                                  │ │
│  │                      │  │  Bio paragraph two.              │ │
│  │                      │  │                                  │ │
│  │                      │  │  ──────────────────────────      │ │
│  │                      │  │  Based in [City].                │ │
│  └──────────────────────┘  └──────────────────────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  Left col: 40% width. Right col: 60% width.
  Red horizontal rule used as section divider.
```

---

## CONTACT PAGE (`/contact`)

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO              VIDEO  PRINTS  ABOUT  CONTACT    ♪  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│                    CONTACT                                       │
│                    ───────────────────────────────               │
│                                                                  │
│          ┌────────────────────────────────────┐                  │
│          │ NAME                               │                  │
│          ├────────────────────────────────────┤                  │
│          │ EMAIL                              │                  │
│          ├────────────────────────────────────┤                  │
│          │ SUBJECT  [▼ dropdown]              │                  │
│          ├────────────────────────────────────┤                  │
│          │ MESSAGE                            │                  │
│          │                                    │                  │
│          │                                    │                  │
│          ├────────────────────────────────────┤                  │
│          │       [ SEND MESSAGE ]             │  ← red button    │
│          └────────────────────────────────────┘                  │
│                                                                  │
│                    IG  /  TW  /  LI                              │  ← social icons
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## ADMIN CRM — LOGIN (`/admin`)

```
┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│                                                                  │
│                    AKIWUMI PHOTO                                 │
│                    ADMIN                                         │
│                                                                  │
│          ┌────────────────────────────────────┐                  │
│          │ USERNAME                           │                  │
│          ├────────────────────────────────────┤                  │
│          │ PASSWORD                           │                  │
│          ├────────────────────────────────────┤                  │
│          │         [ LOGIN ]                  │  ← red button    │
│          └────────────────────────────────────┘                  │
│                                                                  │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
  BG: #000000. All white type. Red button.
  No link from public site — direct URL access only.
```

---

## ADMIN CRM — DASHBOARD (`/admin/dashboard`)

> **Every gallery in the left-hand list is one tile on the public homepage.**
> Publish = visible on site. Unpublish = hidden (not deleted). Drag to reorder = reorders homepage carousel.

```
┌──────────────────────────────────────────────────────────────────┐
│  AKIWUMI PHOTO ADMIN              [Galleries] [Videos] [Pages]  │
│                                   [Settings]          [LOGOUT]  │
├────────────────┬─────────────────────────────────────────────────┤
│                │                                                 │
│  GALLERIES     │  ┌─────────────────────────────────────────┐   │
│  ──────────    │  │  + NEW GALLERY                          │   │
│  ⠿ ● Street   │  ├─────────────────────────────────────────┤   │
│    Portraits   │  │  Gallery Name: [________________]       │   │
│  ──────────    │  │  Slug (URL):   [________________]  ← auto│  │
│  ⠿ ● Arch-    │  │  Description:  [________________]       │   │
│    itecture    │  │                [________________]       │   │
│  ──────────    │  │                                         │   │
│  ⠿ ○ Abstract  │  │  Published:  [ ● ON ] ← toggle          │   │
│    (draft)     │  │  (ON = live on homepage / OFF = draft)  │   │
│  ──────────    │  │                                         │   │
│  [+ NEW]       │  │  Cover Image:                           │   │
│                │  │  ┌──────────┐                           │   │
│  ● = published │  │  │          │  [ SET AS COVER ]         │   │
│  ○ = draft     │  │  │  [img]   │  ← defaults to first img  │   │
│  ⠿ = drag      │  │  │          │                           │   │
│                │  │  └──────────┘                           │   │
│                │  │                                         │   │
│                │  │  Images:  [ UPLOAD / DROP IMAGES ]      │   │
│                │  │                                         │   │
│                │  │  ┌──────┐ ┌──────┐ ┌──────┐            │   │
│                │  │  │[img] │ │[img] │ │[img] │            │   │
│                │  │  │Title:│ │Title:│ │Title:│            │   │
│                │  │  │[   ] │ │[   ] │ │[   ] │            │   │
│                │  │  │Desc: │ │Desc: │ │Desc: │            │   │
│                │  │  │[   ] │ │[   ] │ │[   ] │            │   │
│                │  │  │[★cover]  [✕] │ [★cover]  [✕] │      │   │
│                │  │  └──────┘ └──────┘ └──────┘            │   │
│                │  │  ⠿ drag images to reorder               │   │
│                │  │                                         │   │
│                │  │  [ SAVE ]  [ PUBLISH ]  [ DELETE ]      │   │
│                │  └─────────────────────────────────────────┘   │
└────────────────┴─────────────────────────────────────────────────┘

  Left panel shows all galleries in homepage carousel order.
  Drag ⠿ handle to reorder — this directly changes the homepage tile order.
  ● green dot = published (live on site)
  ○ grey dot  = draft (not visible publicly)
```

**Homepage preview note:** A "PREVIEW ON SITE →" link in the CRM opens `/home` in a new tab so the admin can verify the gallery tile appeared correctly before sharing the URL.

---

**CRM Sections (tab-switched):**

| Tab | Manages |
|---|---|
| Galleries | Create/edit/delete/publish galleries; upload, caption & reorder images; set cover image; drag galleries to reorder homepage carousel |
| Videos | Add/edit/delete/publish videos; thumbnail, title, description, sort order |
| Pages | Edit About bio + image; Prints pricing + text; Splash title + audio; Contact subject options |
| Settings | Admin password, site title, SEO meta |

---

## TRANSITION MAP

```
SPLASH ──[ENTER click]──► HOME
                           blur out → white fade in

HOME ──[tile click]──► GALLERY
                           tile blurs → gallery slides in from right

GALLERY ──[← BACK]──► HOME
                           gallery slides out left → home fades in

GALLERY ──[image click]──► LIGHTBOX (overlay on same page)
                           image expands + backdrop blurs

LIGHTBOX ──[✕ / ESC]──► GALLERY
                           lightbox scales down, overlay fades

HOME/NAV ──[VIDEO]──► VIDEOGRAPHY
                           page transition: blur cross-fade

VIDEOGRAPHY ──[card click]──► VIDEO MODAL
                           modal scales up from card + blur backdrop

VIDEO MODAL ──[✕ / ESC]──► VIDEOGRAPHY
                           modal scales down, overlay fades

ANY PAGE ──[NAV links]──► target page
                           blur cross-fade 0.3s
```

---

---

## MOBILE WIREFRAMES (390px — iPhone 14 baseline)

> All mobile layouts are single-column. Carousels are swipe-driven. Arrow buttons hidden. Min tap target 44×44px throughout.

---

### MOBILE — NAVIGATION

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │  ← 48px tall, black bg, white text
└─────────────────────────┘

  [≡ tapped — full screen menu overlay]

┌─────────────────────────┐
│                     ✕  │
│                         │
│  GALLERIES              │
│  ─────────              │
│  VIDEO                  │
│  ─────────              │
│  PRINTS                 │
│  ─────────              │
│  ABOUT                  │
│  ─────────              │
│  CONTACT                │
│                         │
│                         │
│                         │
└─────────────────────────┘
  BG: #000000. Links: white, Space Grotesk 700, 2rem, uppercase.
  Active link: #E8001C. ✕: top-right, 44×44px.
  Opens with slide-down + fade. Closes swipe-up or ✕.
```

---

### MOBILE — SPLASH PAGE

```
┌─────────────────────────┐
│                         │
│                         │
│                         │
│   WELCOME               │
│   TO                    │
│   AKIWUMI               │
│   PHOTO                 │
│                         │
│                         │
│  ┌─────────────────────┐│
│  │       ENTER         ││  ← full-width red button
│  └─────────────────────┘│
│                         │
└─────────────────────────┘
  Title: clamp(2rem, 10vw, 9rem). Wraps to stacked lines.
  ENTER button: full width (calc(100% - 48px)), 52px height.
  Bottom safe-area padding applied.
```

---

### MOBILE — HOME PAGE

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │
├─────────────────────────┤
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │    [gallery img]  │  │  ← full width tile
│  │                   │  │
│  │                   │  │
│  │                   │  │
│  ├───────────────────┤  │
│  │  GALLERY TITLE    │  │
│  └───────────────────┘  │
│                    ▷15% │  ← peek of next tile
│                         │
│        ● ○ ○ ○          │  ← dot pagination, 24px tap targets
│                         │
└─────────────────────────┘
  Swipe left/right to navigate. No arrows.
  Tile: 100vw - 40px wide, 4:5 ratio.
  Peek: ~15% of next tile visible on right edge.
  ♪ icon: fixed bottom-right, 44×44px, above safe area.
```

---

### MOBILE — SUB-GALLERY PAGE

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │
├─────────────────────────┤
│  ← HOME / PORTRAITS     │  ← breadcrumb, tappable
│                         │
│  STREET                 │
│  PORTRAITS              │  ← title wraps, 2 lines max
│  Documentary work…      │  ← 2-line truncated description
│  ─────────────────      │  ← red rule
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │    [image tile]   │  │  ← full width
│  │                   │  │
│  ├───────────────────┤  │
│  │  Image Title      │  │
│  │  Description…     │  │
│  └───────────────────┘  │
│                    ▷15% │
│        ● ○ ○ ○          │
└─────────────────────────┘
```

**Mobile Lightbox:**
```
┌─────────────────────────┐
│ [blurred bg]        ✕  │  ← ✕ 44×44px
│                         │
│                         │
│   ┌───────────────────┐ │
│   │                   │ │
│   │    [full image]   │ │  ← 100vw, object-fit: contain
│   │                   │ │
│   └───────────────────┘ │
│                         │
│   Image Title           │
│   Description text.     │
│                         │
│  ◄ swipe ►              │  ← swipe to navigate (no arrows)
│                         │
└─────────────────────────┘
  Full screen: 100dvh. Swipe down to close. Swipe left/right for prev/next.
  Pinch to zoom enabled.
```

---

### MOBILE — VIDEOGRAPHY PAGE

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │
├─────────────────────────┤
│  VIDEOGRAPHY            │
│  ───────────────────    │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │  [thumbnail 16:9] │  │
│  │        ▶          │  │
│  │                   │  │
│  ├───────────────────┤  │
│  │  VIDEO TITLE      │  │
│  │  Short desc.      │  │
│  └───────────────────┘  │
│                    ▷15% │
│        ● ○ ○            │
└─────────────────────────┘
```

**Mobile Video Modal:**
```
┌─────────────────────────┐
│ [blurred bg]        ✕  │
│                         │
│  ┌───────────────────┐  │
│  │                   │  │
│  │   VIDEO (16:9)    │  │  ← full width, native controls
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  VIDEO TITLE            │
│  Description text here. │
│                         │
│  [swipe down to close]  │
└─────────────────────────┘
  Full screen: 100dvh. Video autoplay on open. Swipe down to dismiss.
```

---

### MOBILE — PRINTS PAGE

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │
├─────────────────────────┤
│  LIMITED EDITION        │
│  PRINTS                 │
│  ───────────────────    │
│                         │
│  ┌───────────────────┐  │
│  │  SMALL            │  │
│  │  12 × 16"         │  │
│  │  Edition of 10    │  │
│  │  £XXX             │  │
│  └───────────────────┘  │
│                    ▷15% │  ← swipe for Medium/Large/Ultra
│        ● ○ ○ ○          │
│                         │
│  ┌───────────────────┐  │
│  │  PAPER & QUALITY  │  │
│  │  Archival giclée  │  │  ← stacked info cards
│  │  Cotton rag 310gsm│  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │  CERTIFICATION    │  │
│  │  Hand-signed      │  │
│  │  Numbered X/10    │  │
│  └───────────────────┘  │
├─────────────────────────┤
│  [ ENQUIRE ABOUT A  ]   │  ← sticky bottom CTA, full width
│  [      PRINT       ]   │    above safe-area-inset-bottom
└─────────────────────────┘
```

---

### MOBILE — ABOUT PAGE

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │
├─────────────────────────┤
│  ┌───────────────────┐  │
│  │                   │  │
│  │  [portrait image] │  │  ← 100vw, 50vh, object-fit: cover
│  │                   │  │
│  └───────────────────┘  │
│                         │
│  ABOUT                  │
│  ───────────────────    │
│                         │
│  Bio paragraph one      │
│  goes here in full.     │
│                         │
│  Bio paragraph two      │
│  continues here.        │
│                         │
│  ───────────────────    │
│  Based in [City].       │
│                         │
└─────────────────────────┘
```

---

### MOBILE — CONTACT PAGE

```
┌─────────────────────────┐
│  AKIWUMI PHOTO      ≡  │
├─────────────────────────┤
│  CONTACT                │
│  ───────────────────    │
│                         │
│  NAME                   │
│  ┌───────────────────┐  │
│  │                   │  │  ← 48px height inputs
│  └───────────────────┘  │
│  EMAIL                  │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│  SUBJECT                │
│  ┌────────────────── ▼┐ │
│  │ Print Enquiry      │ │
│  └───────────────────┘  │
│  MESSAGE                │
│  ┌───────────────────┐  │
│  │                   │  │
│  │                   │  │  ← 120px min height
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │   SEND MESSAGE    │  │  ← full width red button
│  └───────────────────┘  │
│                         │
│      IG  /  TW  /  LI   │
│                         │
└─────────────────────────┘
  Input height: 48px. All full-width. Correct keyboard types per field.
  No page reload on submit. Success state shown inline.
```

---

### MOBILE — ADMIN CRM LOGIN

```
┌─────────────────────────┐
│                         │
│                         │
│  AKIWUMI PHOTO          │
│  ADMIN                  │
│                         │
│  USERNAME               │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│  PASSWORD               │
│  ┌───────────────────┐  │
│  │                   │  │
│  └───────────────────┘  │
│  ┌───────────────────┐  │
│  │      LOGIN        │  │
│  └───────────────────┘  │
│                         │
└─────────────────────────┘
  CRM is fully functional on mobile — admin can manage content from phone.
  All CRM forms: 48px input height, full width.
  Image upload: supports native mobile file picker + camera.
```

---

*Document version: 1.1 — 2026-05-27 (mobile wireframes added)*
