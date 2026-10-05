import type { DeviceDefinition, DeviceVariant } from "@/editor/types";

/**
 * Device library.
 *
 * Each device is pure data: artwork + the geometry of its screen in the
 * artwork's coordinate system. Adding a device means adding its artwork to
 * `public/devices` and a definition here — the editor needs no changes.
 * See README → "Device definitions".
 */

const variants = (prefix: string, list: [id: string, name: string, swatch: string][]): DeviceVariant[] =>
  list.map(([id, name, swatch]) => ({ id, name, swatch, frameSrc: `/devices/${prefix}-${id}.svg` }));

const phoneVariants = variants("phone", [
  ["graphite", "Graphite", "#2c2c30"],
  ["silver", "Silver", "#d4d4d9"],
  ["sand", "Sand", "#b5ad9f"],
  ["ocean", "Ocean", "#33445a"],
]);

const tabletVariants = (orientation: string) =>
  variants(`tablet-${orientation}`, [
    ["graphite", "Graphite", "#38383d"],
    ["silver", "Silver", "#d8d8dd"],
  ]);

const laptopVariants = variants("laptop", [
  ["graphite", "Graphite", "#3a3a3f"],
  ["silver", "Silver", "#c9c9cf"],
]);

const browserVariants = variants("browser", [
  ["light", "Light", "#f2f2f4"],
  ["dark", "Dark", "#26262b"],
]);

const withDefaultArtwork = (definition: Omit<DeviceDefinition, "frameSrc" | "previewSrc">): DeviceDefinition => {
  const src = definition.variants?.[0]?.frameSrc ?? null;
  return { ...definition, frameSrc: src, previewSrc: `/devices/${definition.id}-preview.svg` };
};

export const DEVICES: DeviceDefinition[] = [
  withDefaultArtwork({
    id: "phone",
    name: "Phone",
    category: "phone",
    frame: { width: 1343, height: 2700 },
    screen: { x: 82, y: 72, width: 1179, height: 2556, radius: 160 },
    body: [{ x: 11, y: 1, width: 1321, height: 2698, radius: 231 }],
    screenFill: "#000000",
    layout: { type: "fixed" },
    variants: phoneVariants,
  }),
  withDefaultArtwork({
    id: "tablet-portrait",
    name: "Tablet",
    category: "tablet",
    frame: { width: 2288, height: 2972 },
    screen: { x: 120, y: 120, width: 2048, height: 2732, radius: 50 },
    body: [{ x: 1, y: 1, width: 2286, height: 2970, radius: 149 }],
    screenFill: "#000000",
    layout: { type: "fixed" },
    variants: tabletVariants("portrait"),
  }),
  withDefaultArtwork({
    id: "tablet-landscape",
    name: "Tablet landscape",
    category: "tablet",
    frame: { width: 2972, height: 2288 },
    screen: { x: 120, y: 120, width: 2732, height: 2048, radius: 50 },
    body: [{ x: 1, y: 1, width: 2970, height: 2286, radius: 149 }],
    screenFill: "#000000",
    layout: { type: "fixed" },
    variants: tabletVariants("landscape"),
  }),
  withDefaultArtwork({
    id: "laptop",
    name: "Laptop",
    category: "desktop",
    frame: { width: 3120, height: 1910 },
    screen: { x: 280, y: 64, width: 2560, height: 1664, radius: [18, 18, 0, 0] },
    body: [
      { x: 221, y: 1, width: 2678, height: 1820, radius: [63, 63, 0, 0] },
      { x: 1, y: 1814, width: 3118, height: 95, radius: [10, 10, 63, 63] },
    ],
    screenFill: "#000000",
    layout: { type: "fixed" },
    variants: laptopVariants,
  }),
  withDefaultArtwork({
    id: "browser",
    name: "Browser",
    category: "browser",
    frame: { width: 1442, height: 957 },
    screen: { x: 1, y: 56, width: 1440, height: 900, radius: [0, 0, 13, 13] },
    body: [{ x: 0, y: 0, width: 1442, height: 957, radius: 14 }],
    screenFill: "#ffffff",
    layout: { type: "stretch-y", start: 120, end: 900, minScreenHeight: 360, maxScreenHeight: 3600 },
    variants: browserVariants,
  }),
  {
    id: "none",
    name: "No frame",
    category: "none",
    frameSrc: null,
    previewSrc: null,
    frame: { width: 1600, height: 1000 },
    screen: { x: 0, y: 0, width: 1600, height: 1000, radius: 0 },
    body: [],
    screenFill: "transparent",
    layout: { type: "screenshot", defaultSize: { width: 1600, height: 1000 }, radiusRatio: 0.02 },
  },
];

const DEVICE_MAP = new Map(DEVICES.map((device) => [device.id, device]));

export const DEFAULT_DEVICE_ID = "phone";

export function getDevice(id: string): DeviceDefinition {
  return DEVICE_MAP.get(id) ?? DEVICE_MAP.get(DEFAULT_DEVICE_ID)!;
}

export function getVariant(device: DeviceDefinition, variantId: string | undefined): DeviceVariant | undefined {
  if (!device.variants?.length) return undefined;
  return device.variants.find((v) => v.id === variantId) ?? device.variants[0];
}

/** Picks a sensible device for a freshly imported screenshot. */
export function suggestDeviceForImage(width: number, height: number): string {
  const ratio = height / width;
  if (ratio >= 1.7) return "phone";
  if (ratio >= 1.15) return "tablet-portrait";
  if (ratio >= 0.85) return "tablet-landscape";
  return "browser";
}
