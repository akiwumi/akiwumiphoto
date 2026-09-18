---
version: alpha
name: Akiwumi Photo — Editorial Portfolio
description: A proposed light, image-led design system derived from Web.webp and the approved four-color palette.
colors:
  primary: "#222222"
  secondary: "#7B7B7B"
  tertiary: "#F8F8F8"
  white: "#FFFFFF"
  background: "#F8F8F8"
  surface: "#FFFFFF"
  on-surface: "#222222"
  accent: "#222222"
  on-accent: "#FFFFFF"
  inverse-surface: "#222222"
  on-inverse: "#FFFFFF"
  border-control: "#7B7B7B"
  focus: "#222222"
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 6rem
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.055em
  h1:
    fontFamily: Space Grotesk
    fontSize: 4rem
    fontWeight: 400
    lineHeight: 1.08
    letterSpacing: -0.045em
  h2:
    fontFamily: Space Grotesk
    fontSize: 2.5rem
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.035em
  h3:
    fontFamily: Space Grotesk
    fontSize: 1.5rem
    fontWeight: 500
    lineHeight: 1.25
    letterSpacing: -0.02em
  body:
    fontFamily: Space Grotesk
    fontSize: 1.125rem
    fontWeight: 400
    lineHeight: 1.65
    letterSpacing: 0em
  navigation:
    fontFamily: Space Grotesk
    fontSize: 1rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0em
  label:
    fontFamily: Space Grotesk
    fontSize: 0.875rem
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0em
  caption:
    fontFamily: Space Grotesk
    fontSize: 0.8125rem
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
rounded:
  none: 0px
  small: 4px
  card: 8px
  pill: 999px
spacing:
  none: 0px
  xs: 4px
  sm: 8px
  md: 12px
  base: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  4xl: 96px
  5xl: 128px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    height: 48px
  button-primary-hover:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    height: 48px
  button-primary-disabled:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    height: 48px
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: 12px 24px
    height: 48px
  arrow-control:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    rounded: "{rounded.pill}"
    size: 48px
  project-card:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.primary}"
    typography: "{typography.label}"
    rounded: "{rounded.small}"
    padding: "{spacing.none}"
  news-card:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.base}"
  filter-chip:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  filter-chip-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  input:
    backgroundColor: "{colors.white}"
    textColor: "{colors.primary}"
    typography: "{typography.body}"
    rounded: "{rounded.small}"
    padding: 12px 16px
    height: 48px
  inverse-panel:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.white}"
    typography: "{typography.body}"
    rounded: "{rounded.card}"
    padding: "{spacing.xl}"
---

# Akiwumi Photo — Reference Design System

**Status:** proposed documentation only; not implemented or approved for implementation.
**Date:** 19 September 2026.
**Visual source:** `/Users/eugene/Desktop/Web.webp`.
**Scope:** public photography and filmmaking website, including galleries, prints, news, enquiries, and collector flows. Admin UI remains outside this proposal.
**Relationship to existing documentation:** a separate alternative to `Docs/AKIWUMI_PHOTO_DESIGN_SYSTEM.md`; this file does not supersede it automatically.

**Mandatory preservation constraints:** retain the gallery structure and its placement on the page exactly as currently presented on the Akiwumi Photo website. Retain the home page's current structure and presentation. These user requirements override any conflicting layout, composition, component, or responsive suggestions elsewhere in this document.

## Overview

Create a calm, editorial portfolio where photography carries the visual identity and the interface stays restrained. The audience includes prospective portrait and commercial clients, collaborators, and print collectors, browsing on desktop and mobile. The reference suggests a predominantly light website with generous spacing, an oversized introduction, asymmetric biography content, image grids, fine dividers, and a dark closing section. Borrow its visual restraint while preserving the current home page presentation and gallery arrangement; do not import the reference's page composition into either. Its tone is personal, precise, and quietly confident. Avoid dashboard-like density, excessive decoration, and uniformly oversized rounded cards.

### What comes from the reference

| Visible characteristic | Translation for Akiwumi Photo |
| --- | --- |
| Large, light-weight greeting beside a portrait | Typography inspiration only; do not replace the existing home page introduction or image arrangement |
| White and pale-gray section backgrounds | Alternate white and tertiary surfaces to structure long pages |
| Asymmetric biography with small supporting modules | Artist biography, portrait, and verified experience or exhibition details |
| Images with compact captions beneath | Restrained caption styling where compatible; retain current gallery positions and home page caption presentation |
| Small circular arrows | Consistent project-opening and gallery-navigation controls |
| Thin-rule experience rows and pill tags | Optional exhibitions, commissions, or publication list using real records |
| Dark photographic banner and dark footer | Optional enquiry banner and a simple contact-led footer |
| Modest radii and little visible elevation | Flat image cards, restrained corners, and contrast-based grouping |

The laptop frame, surrounding presentation title, and mockup shadow belong to the reference presentation, not the website. The exact font, dimensions, spacing, and interactive states cannot be established from the screenshot; the values below are proposed implementation targets, not claimed measurements. Reference copy, metrics, and calls to action are visual examples, not instructions or content to import.

## Colors

Keep the four user-specified colors exactly. To follow the attached reference, this proposal uses tertiary and white as the dominant page surfaces, with primary for text, controls, and inverse sections. This is a proposed shift from the currently implemented dark presentation; no theme change is authorized by this document. Secondary provides supporting geometry and selected large-text accents, not a universal muted-body-text color. Photographs can retain their original colors; the four-color restriction applies to interface chrome. Error, success, and warning states use text and icons rather than introducing additional brand colors.

| Token | Value | Intended role |
| --- | --- | --- |
| Primary | `#222222` | Headings, body text, primary buttons, footer, image-viewer background |
| Secondary | `#7B7B7B` | Input borders, control outlines, large secondary labels, decorative marks |
| Tertiary | `#F8F8F8` | Main page canvas, alternate sections, disabled-control surface |
| White | `#FFFFFF` | Cards, fields, white sections, text on primary |

### Contrast and readable pairings

Calculated sRGB contrast ratios:

| Pair | Ratio | Rule |
| --- | --- | --- |
| Primary / white | 15.91:1 | Preferred for text and solid buttons |
| Primary / tertiary | 14.98:1 | Preferred for body text on the page canvas |
| Secondary / white | 4.23:1 | Below the 4.5:1 normal-text target; do not use for small text |
| Secondary / tertiary | 3.99:1 | Use for borders or sufficiently large text, not captions or body copy |
| Secondary / primary | 3.76:1 | Avoid small gray text on dark panels |
| White / tertiary | 1.06:1 | Surface separation only; insufficient as the sole control boundary |

Use primary for captions, helper text, timestamps, navigation, and field labels. Establish secondary hierarchy through size, weight, and spacing instead of lowering text opacity. When used for text, secondary is limited to large text: at least 24px regular or approximately 19px bold. Form controls require secondary borders; pale surface changes alone are insufficient. Decorative separators may use primary at 12% opacity, but this low-contrast treatment must not indicate an essential boundary or state.

## Typography

Use Space Grotesk throughout, reusing the family already present in the website; its geometric character is a reasonable interpretation of the reference, not a confirmed font match. Pair regular display headings with medium-weight labels and comfortable body copy. Keep headings in sentence case, use tight tracking only at display sizes, and reserve uppercase for the wordmark or occasional short category label. The oversized introduction is a single focal point, not the default treatment for every heading. Body text remains 18px, with a reading width of 60–68 characters. Fall back to Helvetica Neue, Arial, then sans-serif; do not introduce a separate condensed display face in this proposed system.

| Role | Desktop maximum | Mobile target | Weight / line height |
| --- | --- | --- | --- |
| Hero display | 96px | 48px | 400 / 1.0 |
| Page title | 64px | 36px | 400 / 1.08 |
| Section heading | 40px | 28px | 400 / 1.15 |
| Card / subsection title | 24px | 22px | 500 / 1.25 |
| Body | 18px | 18px | 400 / 1.65 |
| Navigation | 16px | 16px | 500 / 1.4 |
| Button / field label | 14px | 14px | 500 / 1.4 |
| Caption / metadata | 13px | 13px | 400 / 1.5 |

Suggested fluid formulas: display `clamp(3rem, 7vw, 6rem)`, page title `clamp(2.25rem, 5vw, 4rem)`, section heading `clamp(1.75rem, 3.2vw, 2.5rem)`. These assume a 16px root while respecting browser text scaling. Allow wrapping rather than clipping names, titles, prices, or translated labels.

## Layout

The current home page and gallery layouts are authoritative. The following container and spacing suggestions apply only to other pages or new components where they do not alter those protected layouts. Use a centered container capped at 1280px, with 48px desktop gutters, 32px tablet gutters, and 20px mobile gutters. Build new editorial layouts around a 12-column desktop grid, a 6-column tablet grid, and a single-column mobile reading flow, with section spacing of 96px, 64px, and 48px respectively. Photography should occupy the largest continuous areas, while text blocks stay narrower and aligned to shared edges. Use natural document height for new editorial pages without copying the screenshot's very small text or device mockup.

### Protected home page and gallery layouts

- **Home page:** retain the existing structure and presentation, including section order, image selection and arrangement, column relationships, image proportions and crops, captions and overlays, navigation placement, and responsive behavior. Do not rebuild it as the reference's portrait-and-greeting hero or add, remove, reorder, or relocate sections to match the reference.
- **Gallery:** retain the existing gallery structure and placement on the page, including its relationship to headings and surrounding content, image order, grid or carousel behavior, tile proportions, caption positions, and responsive arrangement. Do not move the gallery above or below other sections or replace its current layout with the reference's image grids.
- **Scope of future styling:** apply palette, typography, and component tokens only where they preserve those structures and presentation. Current geometry, spacing, and interaction patterns take precedence if a proposed token would change them.
- **Reference role:** Web.webp provides styling inspiration, not authority to redesign the home page or reposition the gallery.
- **Before any later implementation:** capture the then-current home page and gallery at desktop and mobile sizes and use them as the preservation baseline. Obtain a separate explicit request before changing these protected layouts.

### Responsive rules

These are defaults for new or otherwise unprotected layouts. Keep the existing home page and gallery breakpoints, stacking, columns, spacing, and navigation presentation wherever they differ.

| Viewport | Columns and composition | Image grid | Navigation |
| --- | --- | --- | --- |
| Below 768px | Single reading column; 20px gutter | 1 column; 24px gap | Wordmark and accessible menu control |
| 768–1023px | 6-column grid; 32px gutter | 2 columns; 24px gap | Full navigation only if it fits without crowding |
| 1024px and above | 12-column grid; 48px gutter | 3 columns; 24px gap | Horizontal navigation and one enquiry link |

Below desktop width, stack asymmetric content in meaningful reading order: heading, biography, portrait, supporting details. An expanded mobile menu follows the header and does not obscure the current focus. If the existing bottom navigation is retained during a later implementation, style it using these same tokens and reserve safe-area space; do not add a second competing mobile navigation system. Avoid horizontal overflow at 320px or at 200% zoom.

### Page-specific scope

- **Home:** preserve the current structure and presentation in full. Do not prescribe a replacement sequence, hero, card arrangement, caption treatment, or footer placement from the reference.
- **Gallery:** preserve the current structure and placement on the page, along with the existing captions and viewer-entry behavior. Style within that arrangement; do not relocate or recompose it.
- **About:** portrait and biography → optional verified exhibitions, publications, or commissions → enquiry link. Omit unsupported statistics and decorative accomplishment cards.
- **Prints:** artwork → edition and size information → price, availability, shipping information → purchase control. Avoid treating print editions like software pricing tiers.
- **News:** heading → dated image cards → readable article pages. Use news or journal language rather than copying the reference’s design-industry blog labels.
- **Contact:** concise invitation → labelled form → clear submission state. Keep the form column at or below 640px.
- **Account and registration:** simple white form panels on tertiary, clear progress labels, readable order and certificate details. Product illustrations are unnecessary.

### Photography rules

Preserve image color and artistic intent; do not force all artwork into black and white because the reference portrait is monochrome. Retain existing home page and gallery image ratios, crops, caption placements, and overlays. For new, unprotected image modules, suggested ratios are 4:5 for portrait covers, 3:2 for landscape work, and 16:9 for video covers. Crop new thumbnails only with an intentional focal point, and show the full artwork without cropping in the image viewer and print-detail context. A 12px image-to-caption gap is a default for new modules only. Existing home page text overlays remain part of its presentation; preserve them and maintain readable contrast.

## Elevation & Depth

Use spacing, photography, and alternating surfaces as the main sources of depth. Standard cards and navigation have no drop shadows, and the reference’s laptop shadow is not a UI pattern to reproduce. Decorative dividers are 1px primary at 12% opacity; interactive outlines use the full secondary color. Reserve a shadow of `0 16px 48px rgb(34 34 34 / 16%)` for floating dialogs or sheets. A modal backdrop may use primary at 72% opacity, while the full-image viewer uses a solid primary surface. Image hover overlays may use primary at 24% opacity, with white icons housed inside a solid primary control for reliable contrast.

## Shapes

Keep typography, section boundaries, and editorial rows visually square. Use 4px corners for image previews and fields, and 8px for white news cards, dialogs, and promotional panels. Reserve fully rounded shapes for action buttons, small tags, and circular arrow controls. Artwork inside the full-image viewer remains uncropped with square corners. Do not increase every radius to create a softer appearance; the contrast between rectangular photographs and circular controls is part of this system.

## Components

Components should share alignment, typography, and states across portfolio and commerce pages. The YAML lists baseline visual values; the specifications below define borders, interaction, responsive behavior, and accessibility. Some components, including forms, purchase states, and dialogs, are extensions needed by this website rather than elements directly observed in the reference. Treat the reference’s arrow controls as functional navigation, not decoration. Prioritize the following ten component families in any future implementation.

All component prescriptions below are subordinate to the protected home page and gallery layouts. Do not use these defaults to change their current card structure, caption placement, navigation, spacing, image proportions, or interaction presentation. If a component rule conflicts, retain the existing presentation and apply only compatible styling.

### 1. Header and navigation

Use a text wordmark at left, concise navigation at right, and one enquiry action. Suggested desktop height is 88px; mobile minimum is 72px, expanding if content wraps. Use primary text on the light canvas, a 1px underline with 6px offset for the current page, and the same underline on hover. Do not encode the active page solely with a subtle gray change. Keep the header in normal document flow by default.

### 2. Buttons and text links

Primary buttons use primary fill and white text; secondary buttons use white fill, primary text, and a 1px secondary border. Use at least a 48px minimum height, allowing the YAML baseline height to grow with wrapping or text zoom. Primary hover retains the readable color pairing and raises the button by 1px; active returns it to its starting position. Secondary hover changes its surface to tertiary. Text links use an underline for inline prose and pair short standalone actions with a northeast arrow.

All controls receive a 2px primary focus outline with a 3px offset on light surfaces, or a white outline on primary surfaces. Disabled buttons use tertiary fill, primary text, a secondary border, a not-allowed cursor, and disabled semantics; explain why purchase is unavailable nearby. Loading keeps the button width stable, displays an explicit label such as “Sending…”, and blocks duplicate submission. Do not reduce the opacity of the whole button to communicate state.

### 3. Circular arrow controls

Use a 48px primary circle containing a 20px white arrow with a 1.5–2px stroke. A 56px version can be used for the main project feature, but do not create more sizes. Provide a descriptive accessible name such as “View portrait collection”; an arrow alone is not a sufficient label. For arrows layered over images, keep the parent card accessible by keyboard and expose the control on focus as well as hover. Avoid nesting a button inside a linked card.

### 4. Collection and project cards

Let the image lead, followed by a 16px medium title and an optional 13px caption. Do not add a large white container, heavy border, or shadow around every photograph. On pointer hover, the image may scale to 1.02 within its clipping container; show a circular action on hover and keyboard focus. Keep image and caption associated in one descriptive link and provide accurate alt text. Never make access to essential information depend on hover.

### 5. Biography and experience rows

Use an asymmetric desktop arrangement of biography, portrait, and verified supporting details. An experience row can contain organization or exhibition, date and location, a concise description, and category tags, separated by fine rules. On mobile, stack those fields under the entry title instead of squeezing them into a miniature table. If entries expand, use a labelled button with `aria-expanded` and expose the details in document order. Do not invent client counts, percentage improvements, awards, or years of experience from the reference.

### 6. Tags and filters

Static category tags may be small pills with primary text on white or tertiary. Interactive filters use the `filter-chip` and `filter-chip-selected` tokens, a secondary border when unselected, and at least a 44px touch target. Selected filters invert to primary fill and white text, with a visible checkmark or selected label and `aria-pressed`. Allow wrapping rather than an unexplained horizontal strip. Filter state should remain understandable without relying on color alone.

### 7. News and editorial cards

Use a white surface with an 8px radius, image at the top, and 16px text padding. Display an optional category, publication date, and a concise title. Keep metadata in primary rather than low-contrast gray. Use three cards across desktop, two on tablet, and one on mobile. Only show reading time if it is derived from the actual article.

### 8. Forms and status messages

Use persistent 14px labels above white fields with 1px secondary borders and 4px radii. Fields have a minimum height of 48px; textareas start at 144px and may grow. Place helper and validation text below the field in primary, linked programmatically to its input. An invalid field receives a 2px primary border plus an error icon and explicit correction text; never rely on red alone or placeholder-only labels. Announce submission results with appropriate status semantics and preserve entered information after failure.

### 9. Print purchasing and image viewer

Size and frame selectors use the filter treatment, with explicit labels, selected indicators, and disabled availability states. Show the artwork title, edition, currency, price, and purchase action in a clear reading order; final costs must not depend on hover. The viewer uses primary behind the photograph, white text and controls, and clearly labelled next, previous, and close actions. Trap focus while the dialog is open, support Escape, and restore focus to the opening card. On mobile, stack purchase details below the image and keep controls clear of device safe areas; never crop the full-artwork preview.

### 10. Enquiry panel and footer

An optional enquiry panel may place a short invitation over a photograph with a primary scrim or beside the photograph on a solid primary panel. Use white copy, generous padding, and one clear action; use an honest enquiry message rather than the reference’s seasonal promotion. The footer uses a primary background, white text, compact navigation, and a prominent real contact address sourced from existing site content. On mobile, stack the contact address and navigation and allow long addresses to wrap. Decorative grid lines, if retained, remain subtle and cannot replace semantic grouping.

### Motion, icons, and shared states

- **Timing:** 150ms for links and controls; 250ms for image hover; up to 300ms for a dialog or sheet. Use `cubic-bezier(0.22, 1, 0.36, 1)` for transforms.
- **Restraint:** no autoplay hero motion, continuous decorative animation, scroll hijacking, or delayed reveals that hide content.
- **Reduced motion:** remove nonessential transforms and entry animation when reduced motion is requested; retain immediate state feedback.
- **Icons:** use the existing Lucide set at 20px with a consistent 1.5–2px stroke. Label ambiguous actions and hide decorative icons from assistive technology.
- **Empty states:** give a plain-language explanation and one relevant next step. Do not show empty image placeholders as finished content.
- **Loading:** reserve media dimensions, retain readable labels, and use static placeholders under reduced motion.

## Do's and Don'ts

### Do

- Lead with real photography and give images room to breathe.
- Use the four exact palette values through semantic roles; derive transparency only for overlays, shadows, and decorative rules.
- Use primary text on white or tertiary for readable body copy, captions, and metadata.
- Keep section spacing generous, captions compact, and page edges consistently aligned.
- Provide keyboard focus, labelled controls, full-artwork viewing, and usable mobile targets.
- Preserve the current home page structure and presentation, and the gallery's current structure and placement on the page.
- Use verified portfolio content and explicit purchase or enquiry states.

### Don't

- Implement this document without a separate request to change the site.
- Copy the laptop mockup, sample branding, fictional statistics, seasonal offer, or generic designer copy.
- Reintroduce red, gold, gradients, or extra interface colors as decorative accents.
- Put secondary gray on small text, or white text on secondary-filled buttons.
- Apply heavy shadows, giant rounded containers, or hover-only actions throughout the site.
- Force artwork into identical crops, grayscale, fixed-height pages, or animated presentation effects.
- Recompose the home page or move, reorder, or restructure the gallery to resemble the reference.

### Future implementation acceptance criteria

When implementation is separately requested, review the home page, gallery, image viewer, prints, contact, and account flows at mobile, tablet, and desktop widths. Compare the home page and gallery against their captured baseline: section order, gallery position, image arrangement, caption placement, proportions, and responsive presentation must remain unchanged. Verify compatible palette and typography updates, keyboard navigation, reduced motion, text zoom, and form states before claiming the system is applied. Keep full-resolution artwork independent of thumbnail crops. Resolve conflicts with the existing design-system document at that time; this proposal records a visual direction and does not silently replace current requirements.
