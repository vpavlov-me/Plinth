import type { DeviceCategory, PerspectiveId } from "@/editor/types";

/**
 * Multi-device layouts.
 *
 * A layout is pure data: a list of device slots placed in an abstract
 * composition space. Applying it (see `applyLayout` in `scene.ts`) picks a
 * device per slot, sizes every device by its slot, then scales the whole
 * composition to fit the canvas. Adding a layout only needs a new entry here.
 */
export type LayoutSlot = {
  /**
   * Preferred device category. Omitted: keep whatever device the slot reuses
   * (used by "Solo", which never changes the device).
   */
  category?: Extract<DeviceCategory, "phone" | "tablet" | "laptop">;
  /** Centre of the device in composition units (y grows downwards). */
  x: number;
  y: number;
  /** Length of the device's longer side in composition units. */
  size: number;
  /** Degrees, clockwise. */
  rotation: number;
  perspective: PerspectiveId;
  /**
   * Which of the user's screenshots this slot shows (0 = first). Wraps
   * around, so a single screenshot fills every slot.
   */
  screenshot: number;
};

export type LayoutPreset = {
  id: string;
  name: string;
  /** Slots in drawing order: later slots overlap earlier ones. */
  slots: LayoutSlot[];
};

const slot = (
  category: LayoutSlot["category"],
  x: number,
  y: number,
  size: number,
  { rotation = 0, perspective = "front" as PerspectiveId, screenshot = 0 } = {},
): LayoutSlot => ({ category, x, y, size, rotation, perspective, screenshot });

export const LAYOUT_PRESETS: LayoutPreset[] = [
  { id: "solo", name: "Solo", slots: [slot(undefined, 0, 0, 1)] },
  {
    id: "duo",
    name: "Duo",
    slots: [slot("phone", -0.28, 0, 1), slot("phone", 0.28, 0, 1, { screenshot: 1 })],
  },
  {
    id: "stack",
    name: "Stack",
    slots: [
      slot("phone", -0.3, -0.07, 0.94, { screenshot: 2 }),
      slot("phone", 0, 0, 0.97, { screenshot: 1 }),
      slot("phone", 0.3, 0.07, 1),
    ],
  },
  {
    id: "fan",
    name: "Fan",
    slots: [
      slot("phone", -0.44, 0.08, 0.92, { rotation: -10, screenshot: 1 }),
      slot("phone", 0.44, 0.08, 0.92, { rotation: 10, screenshot: 2 }),
      slot("phone", 0, 0, 1),
    ],
  },
  {
    id: "laptop-phone",
    name: "Laptop + Phone",
    slots: [slot("laptop", -0.1, 0, 1.6), slot("phone", 0.68, 0.17, 0.74, { screenshot: 1 })],
  },
  {
    id: "phone-tablet",
    name: "Phone + Tablet",
    slots: [slot("tablet", -0.14, 0, 1.25), slot("phone", 0.5, 0.14, 0.86, { screenshot: 1 })],
  },
];

export const DEFAULT_LAYOUT_ID = "solo";

export function getLayoutPreset(id: string): LayoutPreset {
  return LAYOUT_PRESETS.find((l) => l.id === id) ?? LAYOUT_PRESETS[0]!;
}

/** Device used for a slot when the scene has none of the preferred category. */
export const DEFAULT_DEVICE_BY_CATEGORY: Record<NonNullable<LayoutSlot["category"]>, string> = {
  phone: "phone-pro",
  tablet: "tablet-pro-11",
  laptop: "laptop-pro-14",
};

/** A layout chosen for a number of screenshots dropped at once. */
export function layoutForScreenshotCount(count: number): string {
  if (count >= 3) return "fan";
  if (count === 2) return "duo";
  return "solo";
}
