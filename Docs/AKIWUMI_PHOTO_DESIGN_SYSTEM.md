# AKIWUMI PHOTO — DESIGN SYSTEM

---

## DESIGN PHILOSOPHY

**Movement:** Bauhaus — function is form. Every visual element earns its place.
**Personality:** Brutalist typography. Geometric grid. High contrast. Purposeful tension.
**Feel:** Cinematic, authoritative, minimal. The work dominates. The UI serves.

---

## COLOR SYSTEM

### Primary Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-black` | `#000000` | Backgrounds, primary text, nav |
| `--color-white` | `#FFFFFF` | Page backgrounds, reversed text, surfaces |
| `--color-red` | `#E8001C` | CTAs, active states, accents, rule lines |

### Extended Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-grey-dark` | `#1A1A1A` | Overlay backgrounds, card darks |
| `--color-grey-mid` | `#666666` | Secondary text, subdued labels |
| `--color-grey-light` | `#F2F2F2` | Subtle surface differentiation |
| `--color-red-hover` | `#C00018` | Button hover state (10% darker red) |
| `--color-overlay` | `rgba(0,0,0,0.92)` | Lightbox + modal overlay |
| `--color-blur-bg` | `rgba(0,0,0,0.6)` | Blur panels |

### Color Rules

- **Never** use red as a background for large areas — it is an accent only
- Black and white are used in large fields; red punctuates
- On black surfaces: white text, red buttons
- On white surfaces: black text, red buttons
- No gradients. No shadows. Flat, geometric forms only.

---

## TYPOGRAPHY

### Typeface Stack

| Role | Font | Weight | Notes |
|---|---|---|---|
| Display / Headings | `Space Grotesk` | 700 (Bold) | Bauhaus geometric grotesque |
| Sub-headings | `Space Grotesk` | 500 (Medium) | |
| Body / Captions | `Space Grotesk` | 400 (Regular) | |
| UI Labels / Nav | `Space Grotesk` | 500 (Medium) | All caps, tracking wide |

**Fallback stack:** `'Space Grotesk', 'Helvetica Neue', Arial, sans-serif`

> Alternatively: `Bebas Neue` (display only) paired with `Inter` for body — more aggressive brutalist feel. Decide during build Phase 1.

### Type Scale (Desktop)

| Token | Size | Usage |
|---|---|---|
| `--text-splash` | `clamp(4rem, 8vw, 9rem)` | Splash page title |
| `--text-xl` | `clamp(2.5rem, 4vw, 4rem)` | Page headings |
| `--text-lg` | `clamp(1.5rem, 2.5vw, 2.25rem)` | Gallery titles, section heads |
| `--text-md` | `1.125rem` | Card titles, sub-heads |
| `--text-base` | `1rem` | Body, captions, descriptions |
| `--text-sm` | `0.875rem` | Labels, nav links, metadata |
| `--text-xs` | `0.75rem` | Fine print, breadcrumbs |

### Letter Spacing

| Context | Value |
|---|---|
| Splash title | `0.25em` |
| Nav links | `0.15em` |
| Button labels | `0.12em` |
| Section headings | `0.08em` |
| Body text | `normal` |

### Typography Rules

- All nav links, button labels, and section headings: `UPPERCASE`
- Body/caption text: sentence case
- Line height for headings: `1.0–1.1`
- Line height for body: `1.6`
- Max line length for body text: `60ch`

---

## SPACING SYSTEM

Base unit: `8px`

| Token | Value | Usage |
|---|---|---|
| `--space-1` | `4px` | Micro spacing |
| `--space-2` | `8px` | Tight spacing |
| `--space-3` | `16px` | Default element gap |
| `--space-4` | `24px` | Component padding |
| `--space-5` | `32px` | Section spacing |
| `--space-6` | `48px` | Large section gaps |
| `--space-7` | `64px` | Page-level padding |
| `--space-8` | `96px` | Hero spacing |

---

## GRID SYSTEM

**Philosophy:** Strict Bauhaus grid. Asymmetry is intentional, not accidental.

### Desktop (1440px baseline)

- 12-column grid
- Column gutter: `24px`
- Page margin: `48px` each side
- About page: 5-col / 7-col split
- Gallery header: full-width
- Carousel: full-bleed (edge to edge)

### Mobile (375px baseline)

- 4-column grid
- Column gutter: `16px`
- Page margin: `20px` each side
- All carousels: 1.2 tiles visible

### Breakpoints

| Name | Min-width |
|---|---|
| `sm` | `480px` |
| `md` | `768px` |
| `lg` | `1024px` |
| `xl` | `1280px` |
| `2xl` | `1536px` |

---

## COMPONENT SYSTEM

---

### NAVIGATION BAR

```
Height: 48px
Background: transparent (over imagery), #FFFFFF (over white pages)
Border-bottom: none default; 1px solid #000 on white pages
Position: fixed, z-index: 100

Wordmark: Space Grotesk 500, 1rem, uppercase, tracking 0.12em
Nav links: Space Grotesk 500, 0.875rem, uppercase, tracking 0.15em
Nav link hover: color → #E8001C, transition: 0.2s
Active link: color: #E8001C, underline 2px solid #E8001C offset 4px

Music icon: 32×32px, fixed bottom-right, z-index: 200
```

---

### BUTTONS

**Primary (Red CTA):**
```
Background: #E8001C
Color: #FFFFFF
Font: Space Grotesk 500, 0.875rem, uppercase, tracking 0.12em
Padding: 14px 32px
Border-radius: 0 (sharp — Bauhaus)
Border: none
Hover: background → #C00018, transition: 0.2s
Active: scale(0.97)
```

**Secondary (Outlined):**
```
Background: transparent
Color: #000000
Font: Space Grotesk 500, 0.875rem, uppercase, tracking 0.12em
Padding: 12px 30px
Border: 2px solid #000000
Border-radius: 0
Hover: background → #000000, color → #FFFFFF, transition: 0.2s
```

**Icon Button (close, arrow):**
```
Background: transparent
Color: #FFFFFF (on dark), #000000 (on light)
Hover: color → #E8001C
Size: 40×40px touch target
```

---

### GALLERY CAROUSEL TILE

```
Aspect ratio: 4:5 (portrait default)
Border-radius: 0
Overflow: hidden
Background: #1A1A1A (placeholder)

Image: object-fit: cover, 100% fill, grayscale(0) default

Title overlay:
  Position: bottom-left of tile
  Background: transparent
  Color: #FFFFFF
  Font: Space Grotesk 700, 1rem, uppercase
  Padding: 12px 16px
  Transition: translateY on hover (slides up 4px)

Red accent line:
  Width: 32px, height: 2px, background: #E8001C
  Position: below title
  Appears on hover, transition: scaleX 0 → 1, origin: left

Hover state:
  transform: scale(1.02)
  Transition: 0.3s ease
```

---

### LIGHTBOX

```
Overlay:
  position: fixed, inset: 0
  background: rgba(0,0,0,0.92)
  backdrop-filter: blur(12px)
  z-index: 300
  animation: fadeIn 0.25s ease

Image container:
  max-width: 90vw, max-height: 80vh
  object-fit: contain
  animation: scaleIn from 0.9 → 1.0, 0.3s ease

Close button (✕):
  position: absolute, top: 24px, right: 24px
  color: #E8001C
  font-size: 1.5rem
  cursor: pointer

Caption:
  color: #FFFFFF
  margin-top: 16px
  text-align: center
  max-width: 600px

Navigation arrows:
  position: absolute, vertically centered on image
  left / right: 16px
  color: #FFFFFF
  font-size: 2rem
  hover: color → #E8001C
```

---

### VIDEO MODAL

```
Overlay: same as lightbox
Video wrapper:
  width: min(85vw, 1200px)
  aspect-ratio: 16/9
  background: #000000
  animation: scale from card position → center, 0.35s cubic-bezier(0.16, 1, 0.3, 1)

Video player:
  width: 100%, height: 100%
  controls: native or custom

Title below player:
  color: #FFFFFF
  font: Space Grotesk 700, 1.25rem
  margin-top: 16px

Description:
  color: rgba(255,255,255,0.75)
  font: Space Grotesk 400, 0.9375rem
  margin-top: 8px
  max-width: 700px
```

---

### PRINT EDITION CARDS

```
Layout: horizontal row of 4 cards, equal width
Card:
  border: 2px solid #000000 (default)
  border: 2px solid #E8001C (ultra large / hero tier)
  padding: 32px 24px
  background: #FFFFFF

Size label: Space Grotesk 700, 1.5rem, uppercase, #000
Dimensions: Space Grotesk 400, 0.875rem, #666
Edition count: Space Grotesk 500, 1rem, uppercase
  "EDITION OF 10" or "UNIQUE — 1 PRINT" (red text for ultra)
Price: Space Grotesk 700, 1.25rem
```

---

### FORM FIELDS

```
Input / Textarea:
  border: 2px solid #000000
  border-radius: 0
  padding: 12px 16px
  font: Space Grotesk 400, 1rem
  background: #FFFFFF
  color: #000000
  outline: none
  focus: border-color → #E8001C, transition: 0.2s
  width: 100%

Label:
  font: Space Grotesk 500, 0.75rem, uppercase, tracking: 0.1em
  color: #000000
  margin-bottom: 6px
  display: block

Dropdown select:
  same as input, custom arrow: ▼ in red

Textarea: min-height 120px, resize: vertical
```

---

## ANIMATION & TRANSITION SYSTEM

### Timing Tokens

| Token | Value | Usage |
|---|---|---|
| `--duration-fast` | `150ms` | Micro-interactions, hover states |
| `--duration-mid` | `300ms` | Component transitions, modals open |
| `--duration-slow` | `600ms` | Page transitions, blur effects |
| `--duration-splash` | `1800ms` | Splash title fade-in |
| `--ease-out` | `cubic-bezier(0.0, 0.0, 0.2, 1)` | Exits, fades out |
| `--ease-in-out` | `cubic-bezier(0.4, 0, 0.2, 1)` | Symmetric transitions |
| `--ease-spring` | `cubic-bezier(0.16, 1, 0.3, 1)` | Modal scale, carousel snap |

### Core Transitions

**Splash → Home:**
```
1. Blur radial expands from ENTER button center (blur: 0 → 20px)
2. Opacity fades to white (0.4s overlap)
3. Home page slides up from below (translateY: 20px → 0, 0.5s)
Total: ~0.9s
```

**Page → Page (nav links):**
```
Current page: opacity 1 → 0, blur(0 → 8px), 0.3s
Next page: opacity 0 → 1, blur(8px → 0), 0.3s, 0.1s delay
Total: 0.4s
```

**Home tile → Gallery:**
```
Clicked tile: scale 1 → 1.05, blur 0 → 12px, 0.25s
Gallery slides in from right: translateX(40px → 0) + opacity(0 → 1), 0.4s
```

**Gallery → Home (back):**
```
Gallery slides left: translateX(0 → -40px) + opacity(1 → 0), 0.3s
Home fades back in: opacity(0 → 1), 0.3s
```

**Carousel drag/snap:**
```
Snap physics: momentum + magnetic snap to nearest tile
Transition: cubic-bezier spring, 0.4s
Drag: real-time, no transition
```

**Lightbox open:**
```
Overlay: opacity 0 → 1, 0.25s
Image: scale 0.9 → 1.0 + opacity 0 → 1, 0.3s ease-spring
```

**Modal close:**
```
Image: scale 1.0 → 0.9 + opacity 1 → 0, 0.2s
Overlay: opacity 1 → 0, 0.25s
```

**Blur rule:** Every transition between full pages uses `backdrop-filter: blur` as the lead effect before the cross-fade. Blur anchors the visual language.

---

## ICONOGRAPHY

- Style: Line icons only. No fill icons. Stroke weight: 1.5px.
- Size: 20×20px standard, 24×24px for nav/actions
- Color: inherit (black or white based on context)
- Hover: color → `#E8001C`
- Source: Phosphor Icons or Lucide (MIT licensed, consistent stroke geometry)

**Key icons in use:**
- `ArrowLeft` / `ArrowRight` — carousel navigation
- `X` — modal close
- `Play` — video play overlay
- `MusicNote` / `SpeakerSimpleX` — audio toggle
- Social: `InstagramLogo`, `TwitterLogo`, `LinkedinLogo`

---

## AMBIENT AUDIO

- Format: MP3 + OGG (browser compat fallback)
- Loop: seamless (loop=true, no gap)
- Default state: **OFF** — user activates on ENTER
- Control: music note icon, bottom-right, fixed
- Fade in: 1s linear gain ramp on play
- Fade out: 1s linear gain ramp on pause
- Volume: 25% default
- Persisted across pages via React Audio Context

---

## BAUHAUS GEOMETRIC ACCENTS

Used sparingly as visual structure — never decorative for its own sake:

- **Red horizontal rule:** `height: 2px, background: #E8001C` — used as section dividers
- **Grid lines:** `1px solid rgba(0,0,0,0.1)` — subtle structure in print cards
- **Tile border flash on active:** `2px solid #FFFFFF` on carousel tile hover
- **Oversized page numbers / counters:** `font-size: 6rem, opacity: 0.05` — watermark-style behind content (optional, use with restraint)

---

## RESPONSIVE BEHAVIOR

**Mobile-first approach.** All styles are written for 390px and scaled up. Never the inverse.

### Layout Behaviour by Breakpoint

| Feature | Mobile (`< 768px`) | Tablet (`768–1023px`) | Desktop (`1024px+`) |
|---|---|---|---|
| Nav | Hamburger + fullscreen overlay | Full labels | Full labels |
| Carousel arrows | Hidden — gesture only | Hidden — gesture only | Visible `◄ ►` |
| Carousel tiles visible | 1 full + 15% peek | 2 + 15% peek | 3–4 + partial |
| About layout | Single column (image top) | Two columns | Two columns |
| Prints display | Horizontal swipe carousel | 2×2 grid | 4 across |
| Lightbox | 100vw × 100dvh full screen | 95vw | 90vw max |
| Video modal | 100vw × 100dvh full screen | 95vw | 85vw max |
| Splash text size | `clamp(2rem, 10vw, 4rem)` | `clamp(3rem, 6vw, 6rem)` | `clamp(4rem, 8vw, 9rem)` |
| Splash ENTER button | Full width (calc 100% - 48px) | 280px centred | 200px centred |
| Page margins | 20px | 32px | 48px |
| Prints sticky CTA | Full-width sticky bottom | Inline | Inline |

---

### Touch Interaction Specs

| Gesture | Action |
|---|---|
| Swipe left/right | Advance carousel or lightbox image |
| Swipe down | Dismiss lightbox or video modal |
| Tap | Activate button / open tile / open lightbox |
| Pinch to zoom | Zoom within lightbox only |
| Long press | No action (avoid accidental text selection on images) |

**All interactive targets: minimum 44×44px.** Where visual element is smaller, use invisible tap area expansion via padding or `::after`.

---

### Mobile Nav Overlay

```css
/* Hamburger menu overlay */
.nav-overlay {
  position: fixed;
  inset: 0;
  background: #000000;
  z-index: 500;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 48px 32px;
  /* Animation */
  transform: translateY(-100%);
  transition: transform var(--duration-slow) var(--ease-spring);
}
.nav-overlay.open {
  transform: translateY(0);
}

.nav-overlay a {
  font-size: 2rem;
  font-weight: 700;
  color: #FFFFFF;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 16px 0;
  border-bottom: 1px solid rgba(255,255,255,0.1);
}
.nav-overlay a.active { color: #E8001C; }
```

---

### Viewport Height — Mobile Rule

Always use `100dvh` (dynamic viewport height) for full-screen elements on mobile. `100vh` causes layout bugs on iOS when the browser address bar is visible/hidden.

```css
/* Correct — accounts for iOS address bar */
.splash, .lightbox, .video-modal, .nav-overlay {
  height: 100dvh;
}

/* Wrong — breaks on iOS Safari */
/* height: 100vh; */
```

---

### Safe Area Insets

Applied globally to all fixed/sticky elements that sit at screen edges:

```css
.nav-bar {
  padding-top: env(safe-area-inset-top);
}

.music-toggle,
.sticky-cta {
  padding-bottom: env(safe-area-inset-bottom);
  margin-bottom: env(safe-area-inset-bottom);
}

/* Lightbox and modals */
.lightbox,
.video-modal {
  padding-top: env(safe-area-inset-top);
  padding-bottom: env(safe-area-inset-bottom);
}
```

---

### Responsive Images

All photography images use Next.js `<Image>` with explicit `sizes` to prevent oversized downloads on mobile:

```jsx
<Image
  src={src}
  alt={alt}
  fill
  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
  style={{ objectFit: 'cover' }}
  loading="lazy"         // all images except above-fold hero
  priority={isHero}      // true only for first visible tile
/>
```

---

### Mobile Typography Adjustments

On mobile, reduce letter-spacing slightly — wide tracking on small screens wastes horizontal space:

| Token | Desktop | Mobile (`< 768px`) |
|---|---|---|
| Splash title tracking | `0.25em` | `0.08em` |
| Nav links tracking | `0.15em` | `0.10em` |
| Button labels tracking | `0.12em` | `0.08em` |
| Section headings tracking | `0.08em` | `0.04em` |

---

### Ambient Audio — Mobile

Mobile browsers block audio autoplay. Implementation:

```js
// Audio starts only after explicit user gesture (ENTER tap)
const audioContext = new AudioContext();  // created in user event handler
// audioContext.resume() called in the same event handler as ENTER click
// Persisted across pages via React Context
// Volume: 25% default
// User can toggle via ♪ icon (bottom-right, fixed, 44×44px tap target)
```

The music icon indicates state: filled note = playing, crossed = muted. Never auto-play without consent.

---

## CSS CUSTOM PROPERTIES (MASTER)

```css
:root {
  /* Colors */
  --color-black: #000000;
  --color-white: #FFFFFF;
  --color-red: #E8001C;
  --color-red-hover: #C00018;
  --color-grey-dark: #1A1A1A;
  --color-grey-mid: #666666;
  --color-grey-light: #F2F2F2;
  --color-overlay: rgba(0, 0, 0, 0.92);

  /* Typography */
  --font-sans: 'Space Grotesk', 'Helvetica Neue', Arial, sans-serif;
  --text-splash: clamp(2.5rem, 8vw, 9rem);
  --text-xl: clamp(2rem, 4vw, 4rem);
  --text-lg: clamp(1.25rem, 2.5vw, 2.25rem);
  --text-md: 1.125rem;
  --text-base: 1rem;
  --text-sm: 0.875rem;
  --text-xs: 0.75rem;

  /* Spacing */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 32px;
  --space-6: 48px;
  --space-7: 64px;
  --space-8: 96px;

  /* Animation */
  --duration-fast: 150ms;
  --duration-mid: 300ms;
  --duration-slow: 600ms;
  --ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-spring: cubic-bezier(0.16, 1, 0.3, 1);
}
```

---

*Document version: 1.1 — 2026-05-27 (mobile-first specifications added)*
