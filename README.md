# Plinth

A focused, browser-based composer for presentation-ready device mockups.

**Drop a screenshot → choose a device → adjust the composition → export a polished image.**

Everything runs locally in the browser. There are no accounts, no uploads and no server-side processing.

## Features

- **Input**: drag & drop anywhere, file picker (`⌘O`), or paste (`⌘V`). PNG, JPG and WebP up to 50 MB. Very large
  images are downscaled to at most 8192 px / 48 MP so the editor stays responsive.
- **Devices**: phone, tablet (portrait and landscape), laptop, browser window and no frame. Frame colours are available
  per device. A screenshot that would be badly cropped by the current device switches to a better-fitting one.
- **Canvas**: Original (screenshot at native resolution), 1:1, 4:5, 16:9, 9:16 and custom sizes (100–8000 px).
  Changing the canvas keeps the composition.
- **Composition**: drag on the canvas (snaps to the centre lines), corner handles to scale, the rotation handle (snaps
  to 90°), and Scale / Horizontal / Vertical field sliders in the inspector (double-click a slider to reset it).
  Arrow keys nudge the device (`⇧` for 10 px).
- **Background**: Solid, Gradient, Image or None. Each tab shows built-in options plus the user's own: pick a colour,
  build a two-colour gradient, or upload an image with the "+" tile. The personal library is stored locally and kept
  across sessions; hover a personal tile to remove it. Built-in photos come from Unsplash (see
  `src/editor/presets/photo-presets.ts`).
- **Shadow**: None / Soft / Medium / Strong.
- **Presets**: one-click scenes (Product Hunt, LinkedIn, App Store, Portfolio Hero, Instagram, Presentation).
- **Export**: PNG at 1×/2×/3×, JPG with a quality setting, transparent PNG, and copying to the clipboard (`⌘E` downloads).
- **Undo/redo**: `⌘Z`, `⌘⇧Z` (or `Ctrl+Y`). A drag or slider movement counts as one step.
- **Persistence**: the project is restored after a reload. Scene settings go to `localStorage` and images go to
  IndexedDB.

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
      sidebars/, panels/      Library (devices, presets) and inspector panels (canvas, background, device, shadow)
  editor/                     Framework-light core
    types.ts                  Scene model and device definition types
    scene.ts                  Pure scene operations (immutable)
    history.ts                Undo/redo with transient (coalesced) updates
    store.ts / ui-store.ts    Zustand stores: document + history, and UI-only state
    geometry.ts               Device geometry resolution, fitting and transforms
    assets.ts                 Image asset registry (object URLs) + decoded image cache
    import-image.ts           Validation, decoding and downscaling of imported images
    persistence.ts            localStorage + IndexedDB, with validation of stored data
    devices/definitions.ts    Device library (data only)
    presets/                  Canvas, background, shadow and scene presets
    rendering/                Konva nodes shared by the editor and the exporter
    export/export-image.ts    Offscreen, exact-size export
scripts/generate-device-assets.mjs   Generates the placeholder frame artwork
public/devices/                      Frame artwork
```

### Scene model

The editor uses a constrained, typed scene rather than a generic list of objects:

```ts
type Scene = { canvas: CanvasConfig; background: BackgroundConfig; devices: DeviceInstance[] };
```

- `devices` is an array. The UI currently edits one device, but rendering, history, persistence and presets already
  handle several, which leaves room for future layouts (duo, stack, laptop + phone).
- Device transforms are **relative**: `x`/`y` are fractions of the canvas, and `scale` is relative to the automatic
  "fit" size (`1` = fitted with padding). Canvas changes and device swaps keep the composition without extra logic.
- Images are referenced by asset id. Blobs live in the asset registry as object URLs and never pass through React
  state as base64. Assets that can no longer be reached through the undo history are revoked automatically.
- Shadow values are in canvas pixels.

### Rendering

```
Stage
├── Layer: Background            (solid / gradient / image)
└── Layer: Devices
    └── Group (per device, positioned by its centre)
        ├── Shadow       silhouette shadow only (see shadow-node.tsx)
        ├── Screen       fill + screenshot, clipped to the screen shape
        └── Frame        artwork, optionally drawn as 3 slices (stretchable devices)
```

- Screenshots are drawn with `imageSmoothingQuality = "high"` so downscaled text stays clean.
- Shadows are drawn without their silhouette by using an offset trick. They are computed from the live transform, so
  they look the same on screen, on retina displays and in exports, and transparent screenshots never show a solid shape
  behind them. Frameless screenshots cast an alpha-aware shadow.
- **Export** mounts the same components into an offscreen stage and renders with `pixelRatio = scale`. The output is
  always exactly `width × scale` by `height × scale`, never contains editor UI, and is independent of the current zoom.
  Sizes above 16384 px per side or 100 MP are refused with a clear message. Frame artwork is SVG, so it stays sharp at
  any scale.

## Device definitions

A device is pure data in `src/editor/devices/definitions.ts`:

```ts
{
  id: "phone",
  name: "Phone",
  category: "phone",                 // phone | tablet | desktop | browser | none
  frame: { width: 1343, height: 2700 },                           // artwork size
  screen: { x: 82, y: 72, width: 1179, height: 2556, radius: 160 }, // in artwork coordinates
  body: [{ x: 11, y: 1, width: 1321, height: 2698, radius: 231 }],  // silhouette for the shadow
  screenFill: "#000000",            // behind the screenshot / empty screen
  layout: { type: "fixed" },
  variants: [{ id: "graphite", name: "Graphite", swatch: "#2c2c30", frameSrc: "/devices/phone-graphite.svg" }],
  frameSrc: "/devices/phone-graphite.svg",
  previewSrc: "/devices/phone-preview.svg",
}
```

`radius` is either a number or `[topLeft, topRight, bottomRight, bottomLeft]`.

Layout modes:

- `fixed`: the screen has a fixed size. The screenshot covers it, aligned to the top.
- `stretch-y` (browser): the screen height follows the screenshot's aspect ratio, clamped to
  `minScreenHeight`/`maxScreenHeight`. The artwork is drawn in three slices, and the band between `start` and `end`
  (artwork y-coordinates) is stretched, so it must be vertically uniform.
- `screenshot` (no frame): the screen is the screenshot itself, with corners rounded by `radiusRatio`.

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
2. Add a definition to `DEVICES` in `src/editor/devices/definitions.ts`, with the screen and body geometry measured in
   artwork pixels.
3. That's it. The library, inspector, renderer, exporter and persistence pick it up automatically.

The current frames are original, brand-free placeholders generated by `npm run devices:generate`. Replace them with
higher-fidelity artwork of the same dimensions, or update the geometry to match new artwork.

## Current limitations

- One device per scene in the UI. The model supports several, but layouts (duo, stack, …) aren't exposed yet.
- Placeholder device frames: they're clean and generic, not photorealistic.
- Screenshots are placed with "cover" and top alignment inside fixed screens. There's no manual crop or pan inside the
  screen yet.
- Browser windows clamp very tall (full-page) screenshots to 2.5× the width and crop the rest.
- No zoom or pan in the workspace. The canvas always fits the window.
- Copy-to-clipboard depends on browser support for `ClipboardItem` (Chromium and Safari; Firefox is limited).
- Screens narrower than 768 px get an informational notice instead of the editor.
- The UI is dark-only by design.
