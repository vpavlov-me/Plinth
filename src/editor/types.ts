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

/** A soft colour light placed over a gradient ("mesh" look). */
export type MeshBlob = {
  /** Centre as a fraction of the canvas (0–1). */
  x: number;
  y: number;
  /** Radius as a fraction of the canvas' longer side. */
  r: number;
  /** Hex colour, optionally with alpha (#rrggbbaa). */
  color: string;
  /** Width / height of the light; 1 = round, 2 = twice as wide (organic, "bloom" shapes). */
  stretch?: number;
  /** Degrees, clockwise; turns a stretched light. */
  angle?: number;
  /** 0–1: share of the radius that stays solid before fading. 0 = soft glow, 0.7 = crisp, liquid shape. */
  core?: number;
};

export type GradientConfig = {
  type: "gradient";
  /** Linear base gradient. */
  colors: string[];
  /** Degrees, CSS convention: 0 = bottom → top, 90 = left → right. */
  angle: number;
  /** Optional soft colour lights drawn over the base. */
  blobs?: MeshBlob[];
  /** Film-grain strength, 0–1. */
  grain?: number;
};

export type BackgroundConfig =
  | { type: "solid"; color: string }
  | GradientConfig
  | { type: "image"; source: BackgroundImageSource }
  | { type: "video"; source: BackgroundVideoSource }
  | { type: "transparent" };

export type BackgroundType = BackgroundConfig["type"];

/** A video background: one of the built-in loops or a user upload. */
export type BackgroundVideoSource = { kind: "preset"; videoId: string } | { kind: "upload"; assetId: string };

/** A background photo: either one of the built-in photos or a user upload. */
export type BackgroundImageSource = { kind: "photo"; photoId: string } | { kind: "upload"; assetId: string };

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

/**
 * Placement of the screenshot inside the device screen, independent of the
 * device transform. The screenshot always covers the screen; `zoom` enlarges
 * it beyond that and `x`/`y` choose which part stays visible: 0 aligns the
 * left/top edges, 1 the right/bottom edges. Normalised values survive canvas,
 * device and export-resolution changes.
 */
export type ScreenshotCrop = {
  /** ≥ 1; 1 = the screenshot just covers the screen. */
  zoom: number;
  /** 0–1 */
  x: number;
  /** 0–1 */
  y: number;
};

/** Predefined 2.5D treatments; see `presets/perspective-presets.ts`. */
export type PerspectiveId = "front" | "tilt-left" | "tilt-right" | "perspective-left" | "perspective-right";

export type DeviceInstance = {
  id: string;
  deviceId: string;
  variantId?: string;
  /** Asset id of the screenshot, or null while the device is empty. */
  screenshotId: string | null;
  crop: ScreenshotCrop;
  perspective: PerspectiveId;
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
  /** Drawn in order: later devices overlap earlier ones. The first is the primary device. */
  devices: DeviceInstance[];
  /** The layout preset last applied (see `presets/layout-presets.ts`). */
  layout: string;
  /**
   * The user's screenshots in the order they were added (at most three).
   * Layouts fill their devices from this list, so screenshots survive
   * switching to "Solo" and back.
   */
  screenshots: string[];
};

/* -------------------------------------------------------------------------- */
/* Device definitions                                                         */
/* -------------------------------------------------------------------------- */

export type DeviceCategory =
  "phone" | "tablet" | "laptop" | "desktop" | "watch" | "browser" | "other" | "none" | "custom";

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
  /**
   * User-uploaded frame: its shadow is cast from the artwork's alpha
   * channel instead of the `body` rectangles.
   */
  custom?: boolean;
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
  /** "video" for screen recordings (see `video.ts`); images leave it out. */
  kind?: "image" | "video";
  /** Length of a video, in seconds. */
  duration?: number;
  /** Kept so the asset can be persisted locally. */
  blob: Blob;
};
