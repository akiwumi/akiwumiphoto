# Gallery Room Preview Build Plan

**Goal:** Add a premium gallery preview where clicking a photograph opens a modal that can show the selected image mounted on a living room wall.

**Approach:** Extend the existing gallery lightbox instead of adding a separate route. Keep the current click-to-preview workflow, add a `Room` preview mode, and preserve the original full-image preview as `Photo`.

**Primary Files:**
- `components/Lightbox.tsx`
- `components/RoomPreview.tsx`
- `lib/room-preview-templates.ts`
- `lib/room-preview-geometry.js`
- `lib/room-preview-geometry.d.ts`
- `app/globals.css`
- `public/images/rooms/*`
- `tests/room-preview-geometry.test.mjs`

---

## UX Flow

1. User opens a gallery.
2. User clicks an image tile.
3. Modal opens on the selected image.
4. Modal defaults to `Room` mode.
5. User can switch between:
   - `Room`: selected photo mounted on a living room wall
   - `Photo`: original full-image lightbox view
6. User can browse previous and next images without closing the modal.
7. User can adjust room, artwork size, and frame style.
8. User closes the modal and returns to the gallery.

---

## Version 1 Scope

- Use existing room templates from `public/images/rooms/`.
- Render the selected photograph over a configured wall area.
- Preserve artwork aspect ratio.
- Add frame, mat, and shadow treatment.
- Add `Room / Photo` mode toggle.
- Add size controls: `Small`, `Medium`, `Large`.
- Add room selector.
- Add frame swatches.
- Keep keyboard controls:
  - `Escape`: close modal
  - `ArrowLeft`: previous image
  - `ArrowRight`: next image
- Keep mobile gestures:
  - horizontal swipe: previous / next
  - downward swipe: close

---

## Room Template Assets

Room images live here:

```text
public/images/rooms/
```

Current assets:

```text
public/images/rooms/room-1.jpg
public/images/rooms/room-2.jpg
public/images/rooms/room-3.jpg
public/images/rooms/room-4.jpg
public/images/rooms/room-5.jpg
public/images/rooms/room-6.jpg
```

Each room used by the UI should have metadata:

- template id
- display name
- image path
- wall center X percentage
- wall center Y percentage
- max artwork width percentage
- max artwork height percentage
- default frame
- supported orientations

---

## Data Model

Create `lib/room-preview-templates.ts`.

Responsibilities:

- Define room template types.
- Define room template metadata.
- Define size presets.
- Define frame presets.
- Export default room, default size, and default frame.

Core types:

```ts
type RoomPreviewOrientation = 'portrait' | 'landscape' | 'square';
type RoomPreviewSize = 'small' | 'medium' | 'large';
type RoomPreviewFrame = 'black' | 'white' | 'oak';

type RoomPreviewTemplate = {
  id: string;
  name: string;
  imagePath: string;
  wall: {
    centerXPercent: number;
    centerYPercent: number;
    maxWidthPercent: number;
    maxHeightPercent: number;
  };
  defaultFrame: RoomPreviewFrame;
  supportedOrientations: RoomPreviewOrientation[];
};
```

---

## Geometry Helper

Create `lib/room-preview-geometry.js`.

Responsibilities:

- Calculate artwork dimensions inside a wall zone.
- Preserve aspect ratio.
- Apply selected size scale before fitting.
- Classify image orientation.

Test with `tests/room-preview-geometry.test.mjs`.

Required test coverage:

- landscape image fits by width
- portrait image fits by height
- square image scales evenly
- size scale reduces final dimensions
- orientation classification handles near-square images

---

## Component Plan

### `RoomPreview`

Create `components/RoomPreview.tsx`.

Responsibilities:

- Render living room background.
- Render selected gallery image over the configured wall area.
- Measure selected image natural dimensions.
- Use geometry helper to calculate rendered artwork size.
- Apply frame, mat, and wall shadow.
- Avoid owning modal navigation or gallery state.

Inputs:

- selected gallery image
- room template
- selected size
- selected frame

Acceptance:

- portrait, landscape, and square images all fit without distortion
- artwork stays within wall zone
- preview feels realistic enough for a polished portfolio

---

### `Lightbox`

Modify `components/Lightbox.tsx`.

Responsibilities:

- Own current image index.
- Own active mode: `Room` or `Photo`.
- Own selected room template.
- Own selected artwork size.
- Own selected frame.
- Keep close, keyboard, and swipe behavior.
- Render `RoomPreview` in `Room` mode.
- Render existing full-image preview in `Photo` mode.
- Trap focus inside the modal while open.
- Lock body scroll while modal is open.

Controls:

- close button
- previous / next buttons
- `Room / Photo` toggle
- size selector
- room selector
- frame swatches

Acceptance:

- clicking a gallery image opens the enhanced modal
- user can browse images while staying in room mode
- user can switch to photo mode and back without losing current image
- existing lightbox behavior still works

---

## Styling Plan

Modify `app/globals.css`.

Add styles for:

- modal top bar
- `Room / Photo` segmented toggle
- room preview stage
- artwork frame and mat
- photo-only preview stage
- previous / next arrows
- bottom caption and controls
- size selector
- room selector
- frame swatches
- mobile layout

Design direction:

- dark modal backdrop
- restrained controls
- crisp room preview
- subtle frame depth
- realistic wall shadow
- no busy ecommerce panel

---

## Desktop Layout

- full-screen modal
- mode toggle top-left
- close top-right
- room preview centered
- previous / next arrows on sides
- caption bottom-left
- controls bottom-right

Control order:

```text
Room | Photo    Size: Small Medium Large    Room: Black Wall Gallery Room Quiet Lounge    Frame swatches
```

---

## Mobile Layout

- full-screen modal
- top controls remain compact
- preview fills the upper area
- caption and controls stack below
- horizontal scroll allowed inside option groups
- swipe left/right changes image
- swipe down closes modal

Mobile priorities:

1. room preview clarity
2. easy close
3. easy next/previous browsing
4. compact controls

---

## Accessibility Requirements

- Modal uses `role="dialog"`.
- Modal sets `aria-modal="true"`.
- Close button has accessible label.
- Previous and next buttons have accessible labels.
- Mode and option controls use real buttons.
- Active controls expose `aria-pressed`.
- Keyboard navigation remains intact.
- Focus remains inside modal.
- Body scroll is locked while modal is open.
- `Escape` closes modal.
- Controls meet contrast requirements.

---

## Verification

Run:

```bash
node --test tests/room-preview-geometry.test.mjs
npx eslint components/Lightbox.tsx components/RoomPreview.tsx lib/room-preview-templates.ts
npm run build
```

Manual checks:

- Open `/gallery/street-portraits`.
- Click an image tile.
- Confirm modal opens in `Room` mode.
- Confirm artwork appears on the wall.
- Switch to `Photo` mode.
- Switch back to `Room` mode.
- Change size.
- Change room.
- Change frame.
- Browse previous and next images.
- Press `Escape`.
- Test mobile viewport.

Known repo note:

- Full `npm run lint` may fail because of existing admin dashboard lint errors unrelated to this feature.

---

## Build Order

1. Add geometry tests.
2. Add geometry helper.
3. Add room template config.
4. Create `RoomPreview`.
5. Upgrade `Lightbox`.
6. Add responsive styles.
7. Run targeted tests and build.
8. Manually inspect the modal locally.

---

## Future Improvements

- Filter room templates by image orientation.
- Add print dimensions.
- Add purchase or inquiry CTA.
- Add per-gallery print eligibility.
- Add perspective transform metadata for angled walls.
- Add admin controls for room template metadata.

