# Plinth

A focused, browser-based composer for presentation-ready device mockups.

**Drop a screenshot → choose a device → adjust the composition → export a polished image.**

Everything runs locally in the browser. There are no accounts, no uploads and no server-side processing. The
production site counts visits with Yandex Metrica.

## Features

- **First visit**: a calm starter mockup — a black phone on the Blue Hour gradient in a 4:5 canvas — with the upload prompt
  inside the phone's screen, folders collapsed, and a small three-step hint ("Add a screenshot · Pick a device or layout ·
  Export") that is closed with one click and disappears for good after the first export.
- **Input**: "Choose file" on the mockup's screen or "Add screenshot" in the inspector; also drag & drop anywhere, paste
  (`⌘V`) or `⌘O`. PNG, JPG and WebP up to 50 MB. Very large
  images are downscaled to at most 8192 px / 48 MP so the editor stays responsive.
- **Devices**: 25 built-in devices with colour options — phones (Pro, Pro Max, standard, compact with home button,
  Android Pro / Ultra / Fold), tablets (13″ and 11″ pro, mini, Android, 2-in-1), laptops (Air 13″, Pro 14″/16″,
  14″ Windows-style), desktops (24″ all-in-one, 27″ display), a watch, a spatial glass window, four window styles
  (Safari-, Chromium-style and minimal browser, app window) and no frame. Adding a screenshot never changes the device:
  the screenshot fills the screen you picked.
- **Layouts**: Solo, Duo, Stack, Fan, Laptop + Phone and Phone + Tablet arrange several devices in one click. The
  composition is fitted to the canvas, the current screenshot fills every device, and screenshots you have added are
  handed out in the order you added them (mixed layouts put each one on the device whose screen fits it best). Click a
  device — or use the Device 1/2/3 switcher in the inspector — to edit, move, scale, rotate or replace it on its own;
  `⌫` removes a secondary device. Dropping two or three screenshots at once opens Duo or Fan with one per device.
- **Upload prompts**: every device without a screenshot shows a minimal upload prompt (click anywhere on the screen,
  drop or paste) with the screenshot size that fits the screen exactly, e.g. 1206 × 2622 px (windows: a width only). A prompt is clipped by the devices in
  front of it, shrinks to its icon when its screen is partly covered, and is left out when the screen is mostly hidden.
- **Perspective**: Front, Tilt Left, Tilt Right, Perspective Left and Perspective Right, per device. Presets only — no
  angles or cameras — and they export at full resolution with matching shadows.
- **Screenshot crop**: zoom (100–400 %) and position the screenshot inside the screen with the Screenshot section, or
  double-click a device (or "Adjust on canvas") to drag and scroll-zoom it directly; `Esc` finishes.
- **Match colors**: builds a mesh-gradient background from the screenshot's own colours, locally and deterministically.
  One click applies "Soft"; "Vivid" and "Dark" variations sit next to it.
- **Your own frames**: upload any PNG/WebP device frame with a transparent screen (for example official bezels you
  downloaded under their licence). The screen opening is detected automatically, the shadow follows the frame's shape,
  and the frame is kept in your local library — it never leaves your browser.
- **Canvas**: the inspector's Canvas section: Original (screenshot at native resolution), 1:1, 4:5, 16:9, 9:16 and
  custom sizes (100–8000 px).
  Changing the canvas keeps the composition.
- **Composition**: drag on the canvas (snaps to the centre lines), corner handles to scale, the rotation handle (snaps
  to 90°), and Scale / Horizontal / Vertical field sliders in the inspector (double-click a slider to reset it).
  Arrow keys nudge the device (`⇧` for 10 px).
- **Background**: Solid, Gradient, Image or None. Each tab shows built-in options plus the user's own: pick a colour,
  build a two-colour gradient, or upload an image with the "+" tile. Built-in gradients include mesh gradients (soft
  colour lights with film grain), five signature gradients (Liquid Blue, Liquid Mint, Blue Hour, Pink Orange, Sky Indigo) built from layered
  colour lights that can be stretched, turned and given a crisp edge. The personal library is stored locally and kept
  across sessions; hover a personal tile to remove it. The Image tab also offers six built-in artworks from museum collections
  (see [Background images](#background-images)).
- **Shadow**: None / Soft / Medium / Strong.
- **Presets**: social sizes (Instagram post/portrait/story, X, LinkedIn, Facebook, Pinterest, YouTube thumbnail,
  Threads, Dribbble, Behance, Open Graph) that resize the canvas and re-fit the devices, plus showcase scenes that also
  set a background, a layout and a look: Product Hunt (two tilted phones), App Store (front-facing phone with room for a
  headline), Google Play feature graphic, Portfolio hero (laptop + phone) and Presentation.
- **Export**: PNG at 1×/2×/3×, JPG with a quality setting, transparent PNG, and copying to the clipboard (`⌘E` downloads).
- **Panels**: floating library (left: Devices, Layouts and Presets, each part scrolls independently and collapses; groups
  are folders) and properties panel (right: Canvas, Screenshot, Mockup, Background, Shadow and Perspective — each
  section collapses). Both panels are always visible. All expanding and collapsing is animated (and respects
  "reduce motion").
- **Frame title**: like a Figma frame, the canvas has a title above it with the size preset's name (or the matching
  social preset) and its dimensions.
- **Sliders**: hovering shows the value under the pointer (the one a click picks); double-clicking resets the default.
- **Theme**: light and dark, following the system by default; the toolbar button cycles System → Light → Dark and the
  choice is remembered per browser.
- **Help**: a keyboard shortcuts legend (toolbar button or `?`) and an About dialog with links to the author.
- **Reset**: the toolbar's Reset button (next to Export) appears once the project differs from the default scene. After
  a confirmation it starts over with the default scene and no screenshots, as one undo step. Your library (own frames,
  gradients and images) is kept. The Screenshot and Mockup sections' Reset buttons likewise only show when there is
  something to reset.
- **Undo/redo**: `⌘Z`, `⌘⇧Z` (or `Ctrl+Y`). A drag or slider movement counts as one step.
- **Persistence**: the project — including every device, its crop and perspective, the layout and the selected device —
  is restored after a reload. Scene settings go to `localStorage` and images go to IndexedDB.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript (strict) · Tailwind CSS v4 · Base UI · Lucide · Konva + react-konva ·
Zustand · Vitest · Playwright.

## Development

```bash
npm install
npm run dev          # http://localhost:3000

npm run typecheck    # tsc --noEmit
npm run lint         # ESLint (next/core-web-vitals + typescript)
npm run format       # Prettier
npm test             # unit tests (Vitest)
npm run build        # production build

# End-to-end tests run against the production build (`npm run build` first).
# Set PLAYWRIGHT_CHROMIUM_PATH to use an existing Chromium instead of `npx playwright install`.
npm run test:e2e
```

## Architecture

```
src/
  app/                        Next.js entry (layout, page, global styles + design tokens)
  components/
    ui/                       Small primitives on top of Base UI (button, tooltip, slider, number field, …)
    editor/                   Editor shell, toolbar, workspace, export menu, shortcuts, persistence hook
      canvas-stage.tsx        Interactive Konva stage (drag, transformer, snapping guides)
      sidebars/, panels/      Library (devices, layouts, presets) and inspector panels (device, screenshot,
                              perspective, background, shadow)
  editor/                     Framework-light core
    types.ts                  Scene model and device definition types
    scene.ts                  Pure scene operations (immutable)
    history.ts                Undo/redo with transient (coalesced) updates
    store.ts / ui-store.ts    Zustand stores: document + history, and UI-only state
    geometry.ts               Device geometry resolution, fitting, transforms, outlines and crop math
    color-match.ts            Palette extraction and "Match colors" backgrounds
    assets.ts                 Image asset registry (object URLs) + decoded image cache
    import-image.ts           Validation, decoding and downscaling of imported images
    persistence.ts            localStorage + IndexedDB, with validation of stored data
    devices/definitions.ts    Device library (data only)
    presets/                  Canvas, background, shadow, layout, perspective and scene presets
    rendering/                Konva nodes shared by the editor and the exporter, device drawing, perspective renderer
    export/export-image.ts    Offscreen, exact-size export
scripts/generate-device-assets.mjs   Generates the placeholder frame artwork
public/devices/                      Frame artwork
```

### Scene model

The editor uses a constrained, typed scene rather than a generic list of objects:

```ts
type Scene = {
  canvas: CanvasConfig;
  background: BackgroundConfig;
  devices: DeviceInstance[]; // drawing order; the first is the primary device
  layout: string; // layout preset last applied
  screenshots: string[]; // the user's screenshots in the order they were added (≤ 3)
};
type DeviceInstance = {
  id: string;
  deviceId: string;
  variantId?: string;
  screenshotId: string | null;
  crop: { zoom: number; x: number; y: number }; // screenshot inside the screen
  perspective: "front" | "tilt-left" | "tilt-right" | "perspective-left" | "perspective-right";
  x: number;
  y: number;
  scale: number;
  rotation: number; // device transform
  shadow: ShadowConfig;
};
```

- Device transforms are **relative**: `x`/`y` are fractions of the canvas, and `scale` is relative to the automatic
  "fit" size (`1` = fitted with padding). Canvas changes keep a single device's composition without extra logic;
  several devices are re-fitted as a group so their proportions to each other survive.
- The **crop** is separate from the device transform and normalised: the screenshot always covers the screen, `zoom`
  (≥ 1) enlarges it and `x`/`y` (0–1) choose the visible part (0 = left/top edge). The default `{ 1, 0.5, 0 }` is the
  classic "cover, top-aligned" placement. It survives canvas, device and export-resolution changes.
- There is no generic layer list: z-order is the order of `devices`, and the UI never exposes it.
- Images are referenced by asset id. Blobs live in the asset registry as object URLs and never pass through React
  state as base64. Assets that can no longer be reached through the undo history are revoked automatically.
- Shadow values are in canvas pixels.

### Layouts

`presets/layout-presets.ts` describes each layout as data: slots with a preferred category (phone, tablet, laptop), a
centre and size in abstract composition units, a rotation, a perspective and which screenshot the slot shows. Applying
a layout (`applyLayout` in `scene.ts`, one undo step) reuses devices whose category matches, adds missing ones with the
model already used in the scene for that category, assigns screenshots, then fits the whole composition to the canvas.
Adding a layout is a new entry in that file; the library tile is drawn from the same data.

### Persistence and migrations

The scene is stored as `{ version, scene, selectedDeviceId }` under `plinth.scene.v1`. Version 2 added `crop`,
`perspective`, `layout`, `screenshots` and the selected device. `sanitizeScene` validates every field and fills
missing ones with defaults, so version 1 projects open unchanged (one device, Front, default crop).

### Rendering

```
Stage
├── Layer: Background            (solid / gradient / image)
└── Layer: Devices
    └── Group (per device, positioned by its centre)
        ├── Shadow       silhouette shadow only (see shadow-node.tsx)
        └── Artwork      screen fill + cropped screenshot (clipped) + frame artwork
```

- `rendering/device-artwork.ts` is the single drawing routine for a device (screen, crop, frame slices). The editor,
  the exporter and the perspective renderer all call it, so they can't drift apart.
- **Perspective** presets turn the device in 3D and project it with a fixed camera
  (`presets/perspective-presets.ts`). Canvas 2D can't draw projective transforms, so the flat artwork is rendered into
  an offscreen canvas and projected by a tiny WebGL2 program as one textured quad with perspective-correct, mipmapped
  sampling. It renders at the device's real output density (read from the context transform), so 3× exports are
  rendered at 3×; results are cached per density. The projected image also casts the shadow. Without WebGL the device
  falls back to Front.
- Screenshots are drawn with `imageSmoothingQuality = "high"` so downscaled text stays clean.
- Shadows are drawn without their silhouette by using an offset trick. They are computed from the live transform, so
  they look the same on screen, on retina displays and in exports, and transparent screenshots never show a solid shape
  behind them. Frameless screenshots, custom frames and perspective devices cast alpha-aware shadows.
- **Export** mounts the same components into an offscreen stage and renders with `pixelRatio = scale`. The output is
  always exactly `width × scale` by `height × scale`, never contains editor UI, and is independent of the current zoom.
  Sizes above 16384 px per side or 100 MP are refused with a clear message. Frame artwork is SVG, so it stays sharp at
  any scale.

## Device definitions

Built-in devices are generated: `scripts/generate-device-assets.mjs` draws every frame as SVG into `public/devices/`
and writes their geometry to `src/editor/devices/catalog.json`, which `definitions.ts` loads. Run
`npm run devices:generate` after changing the script. An entry looks like this:

```jsonc
{
  "id": "phone-pro",
  "name": "Phone Pro 6.3″",
  "category": "phone", // phone | tablet | laptop | desktop | watch | browser | other
  "frame": { "width": 1346, "height": 2738 }, // artwork size
  "screen": { "x": 70, "y": 58, "width": 1206, "height": 2622, "radius": 172 }, // artwork coordinates
  "body": [{ "x": 13, "y": 1, "width": 1320, "height": 2736, "radius": 229 }], // silhouette for the shadow
  "screenFill": "#000000", // behind the screenshot / empty screen
  "layout": { "type": "fixed" },
  "variants": [{ "id": "black", "name": "Black", "swatch": "#3b3a38", "frameSrc": "/devices/phone-pro-black.svg" }],
  "previewSrc": "/devices/phone-pro-preview.svg",
}
```

`radius` is either a number or `[topLeft, topRight, bottomRight, bottomLeft]`.

Layout modes:

- `fixed`: the screen has a fixed size. The screenshot covers it (by default aligned to the top; see the crop).
- `stretch-y` (windows): the screen height follows the screenshot's aspect ratio, clamped to
  `minScreenHeight`/`maxScreenHeight`. The artwork is drawn in three slices, and the band between `start` and `end`
  (artwork y-coordinates) is stretched, so it must be vertically uniform.
- `screenshot` (no frame): the screen is the screenshot itself, with corners rounded by `radiusRatio`.

### Licensing

All built-in artwork is original and brand-free: no logos, and devices use generic names ("Phone Pro 6.3″",
"Laptop Air 13″") rather than trademarked product names. Official manufacturer bezels are not bundled because their
licences don't allow redistribution in a third-party tool; users can load them themselves through "Upload frame".

### Device asset format

- Any image the browser can decode (SVG recommended; PNG works too), with exactly `frame.width × frame.height` pixels.
- The screen area must be **transparent**. The screenshot is drawn underneath and shows through, while anything drawn
  over the screen (such as a camera cutout) stays on top.
- The screenshot is clipped 2 px larger than `screen` to avoid seams, so the artwork should be opaque for a few pixels
  around the screen opening.
- `body` should sit slightly inside the artwork's outer edge so the shadow never peeks out from behind the frame.
- Optional `*-preview.svg` thumbnails for the library work best with a filled screen.

### Adding a new device

1. Add the artwork (one file per colour variant) to `public/devices/`.
2. Either describe it in `scripts/generate-device-assets.mjs` (builders exist for handhelds, laptops, monitors, watches
   and windows) and run `npm run devices:generate`, or add an entry with hand-measured geometry to `catalog.json`.
3. That's it. The library, inspector, renderer, exporter and persistence pick it up automatically.

Artwork can be replaced by higher-fidelity files of the same dimensions without touching any code.

## Background images

The built-in images in `public/backgrounds/` (`<id>.jpg` at 2560 px wide and `<id>-thumb.jpg` for the tile) are
public-domain artworks published on [Unsplash](https://unsplash.com) by museums — Birmingham Museums Trust, the
Cleveland Museum of Art and the Art Institute of Chicago — used under the [Unsplash License](https://unsplash.com/license)
(free photos only, not Unsplash+). They were chosen to be distinctive yet quiet behind a device. `npm run
backgrounds:fetch` downloads them again.

The list lives in `PHOTO_PRESETS` in `src/editor/presets/photo-presets.ts`, with each artwork's `author` and
`sourceUrl`; the tile's tooltip shows the attribution. To add an
image, add it to both `PHOTO_PRESETS` and `scripts/fetch-backgrounds.sh` and run the script.

## Current limitations

- Built-in frames are clean, generic illustrations, not photorealistic renders.
- Browser windows clamp very tall (full-page) screenshots to 2.5× the width and crop the rest.
- Perspective needs WebGL2; without it devices are drawn front-facing.
- Layouts hold at most three devices, and switching to a layout with fewer devices drops the extra ones (their
  screenshots stay available for the next layout).
- No zoom or pan in the workspace. The canvas always fits the window.
- Copy-to-clipboard depends on browser support for `ClipboardItem` (Chromium and Safari; Firefox is limited).
- Screens narrower than 768 px get an informational notice instead of the editor.
