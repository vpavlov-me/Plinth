import catalog from "@/editor/devices/catalog.json";
import type { DeviceCategory, DeviceDefinition, DeviceVariant } from "@/editor/types";

/**
 * Device library.
 *
 * Built-in devices are pure data generated together with their artwork by
 * `scripts/generate-device-assets.mjs` (→ `catalog.json` + `public/devices`).
 * Users can add their own frames (see `custom-frames.ts`); those are
 * registered here at runtime so the rest of the editor treats every device
 * the same way.
 */

const BUILT_IN: DeviceDefinition[] = (catalog as unknown as Omit<DeviceDefinition, "frameSrc">[]).map((device) => ({
  ...device,
  frameSrc: device.variants?.[0]?.frameSrc ?? null,
}));

const FRAMELESS: DeviceDefinition = {
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
};

export const DEVICES: DeviceDefinition[] = [...BUILT_IN, FRAMELESS];

const DEVICE_CATEGORIES: { id: DeviceCategory; label: string }[] = [
  { id: "phone", label: "Phones" },
  { id: "tablet", label: "Tablets" },
  { id: "laptop", label: "Laptops" },
  { id: "desktop", label: "Desktops" },
  { id: "watch", label: "Watch" },
  { id: "browser", label: "Windows" },
  { id: "other", label: "Other" },
  { id: "none", label: "Other" },
];

/** Built-in devices grouped for pickers (categories sharing a label merge). */
export const DEVICE_GROUPS: { label: string; devices: DeviceDefinition[] }[] = [
  ...new Set(DEVICE_CATEGORIES.map((c) => c.label)),
].map((label) => ({
  label,
  devices: DEVICES.filter((d) => DEVICE_CATEGORIES.find((c) => c.id === d.category)?.label === label),
}));

export const DEFAULT_DEVICE_ID = "phone-pro";

/** Ids used by earlier versions, mapped to their closest current device. */
const LEGACY_IDS: Record<string, string> = {
  "tablet-portrait": "tablet-pro-13",
  "tablet-landscape": "tablet-pro-13-landscape",
};

const builtInMap = new Map(DEVICES.map((device) => [device.id, device]));
let customMap = new Map<string, DeviceDefinition>();

/** Replaces the set of user-uploaded frames (called by the library store). */
export function setCustomDevices(devices: DeviceDefinition[]): void {
  customMap = new Map(devices.map((device) => [device.id, device]));
}

export function hasDevice(id: string): boolean {
  return builtInMap.has(LEGACY_IDS[id] ?? id) || customMap.has(id);
}

export function getDevice(id: string): DeviceDefinition {
  return builtInMap.get(LEGACY_IDS[id] ?? id) ?? customMap.get(id) ?? builtInMap.get(DEFAULT_DEVICE_ID)!;
}

export function getVariant(device: DeviceDefinition, variantId: string | undefined): DeviceVariant | undefined {
  if (!device.variants?.length) return undefined;
  return device.variants.find((v) => v.id === variantId) ?? device.variants[0];
}

/**
 * Screenshot size that fills the device's screen exactly, as shown in the
 * upload prompt: the screen's native pixels, only a width for windows whose
 * height follows the screenshot, or null when any size fits.
 */
export function idealScreenshotSize(device: DeviceDefinition): string | null {
  const { width, height } = device.screen;
  if (device.layout.type === "screenshot") return null;
  if (device.layout.type === "stretch-y") return `${width} px wide`;
  return `${Math.round(width)} × ${Math.round(height)} px`;
}
