/**
 * Scene model.
 *
 * The scene is a constrained, typed structure centred on mockups — not a
 * generic list of canvas objects. Everything here is plain serialisable data;
 * binary assets (screenshots, background images) are referenced by id and
 * live in the asset registry (`assets.ts`).
 */

export type CanvasPresetId = "original" | "square" | "portrait" | "landscape" | "story" | "custom";

export type CanvasConfig = {
  width: number;
  height: number;
  preset: CanvasPresetId;
};

export type GradientConfig = {
  type: "gradient";
  colors: string[];
  /** Degrees, CSS convention: 0 = bottom → top, 90 = left → right. */
  angle: number;
};

export type BackgroundConfig =
  | { type: "solid"; color: string }
  | GradientConfig
  | { type: "image"; assetId: string; fit: "cover" | "contain" }
  | { type: "transparent" };

export type BackgroundType = BackgroundConfig["type"];

export type ShadowPresetId = "none" | "soft" | "medium" | "strong" | "custom";

/** Shadow values are expressed in canvas pixels. */
export type ShadowConfig = {
  preset: ShadowPresetId;
  blur: number;
  /** 0–1 */
  opacity: number;
  offsetX: number;
  offsetY: number;
};

export type DeviceInstance = {
  id: string;
  deviceId: string;
  variantId?: string;
  /** Asset id of the screenshot, or null while the device is empty. */
  screenshotId: string | null;
  /** Centre of the device as a fraction of the canvas size (0.5 = centred). */
  x: number;
  y: number;
  /** Size relative to the automatic "fit" size (1 = fitted to the canvas). */
  scale: number;
  /** Degrees, clockwise. */
  rotation: number;
  shadow: ShadowConfig;
};

export type Scene = {
  canvas: CanvasConfig;
  background: BackgroundConfig;
  devices: DeviceInstance[];
};

/* -------------------------------------------------------------------------- */
/* Device definitions                                                         */
/* -------------------------------------------------------------------------- */

export type DeviceCategory = "phone" | "tablet" | "desktop" | "browser" | "none";

/** Uniform radius or per-corner radii: [top-left, top-right, bottom-right, bottom-left]. */
export type CornerRadius = number | [number, number, number, number];

export type Rect = { x: number; y: number; width: number; height: number };

export type RoundedRect = Rect & { radius: CornerRadius };

export type DeviceVariant = {
  id: string;
  name: string;
  /** CSS colour used for the variant swatch. */
  swatch: string;
  frameSrc: string;
};

/**
 * How a device adapts to the screenshot.
 * - `fixed`: the screen has a fixed size; the screenshot covers it (top-aligned).
 * - `stretch-y`: the screen height follows the screenshot aspect ratio. The
 *   frame is drawn in three slices and the band between `start` and `end`
 *   (frame coordinates) is stretched vertically.
 * - `screenshot`: no frame; the screen is exactly the screenshot.
 */
export type DeviceLayoutMode =
  | { type: "fixed" }
  | { type: "stretch-y"; start: number; end: number; minScreenHeight: number; maxScreenHeight: number }
  | { type: "screenshot"; defaultSize: { width: number; height: number }; radiusRatio: number };

export type DeviceDefinition = {
  id: string;
  name: string;
  category: DeviceCategory;
  /** Default frame artwork; null for frameless devices. */
  frameSrc: string | null;
  previewSrc: string | null;
  frame: { width: number; height: number };
  screen: RoundedRect;
  /** Silhouette used to cast the shadow (frame coordinates). */
  body: RoundedRect[];
  /** Colour shown behind the screenshot (and as the empty screen); may be "transparent". */
  screenFill: string;
  layout: DeviceLayoutMode;
  variants?: DeviceVariant[];
};

/** Concrete geometry of a device for a given screenshot (frame coordinates). */
export type ResolvedDeviceGeometry = {
  width: number;
  height: number;
  screen: RoundedRect;
  body: RoundedRect[];
  /** Frame image slices: source rect in the artwork → destination rect. */
  frameSlices: { src: Rect; dest: Rect }[];
};

export type ImageAsset = {
  id: string;
  url: string;
  width: number;
  height: number;
  name: string;
  /** Kept so the asset can be persisted locally. */
  blob: Blob;
};
