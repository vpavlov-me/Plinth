import { getPerspectivePreset, projectRect } from "@/editor/presets/perspective-presets";
import type {
  CanvasConfig,
  CornerRadius,
  DeviceDefinition,
  DeviceInstance,
  PerspectiveId,
  Rect,
  ResolvedDeviceGeometry,
  RoundedRect,
  ScreenshotCrop,
} from "@/editor/types";

/** Fraction of the canvas kept free on each side when a device is fitted. */
export const FIT_PADDING = 0.09;

export type Size = { width: number; height: number };

/**
 * Resolves the concrete frame + screen geometry of a device for a given
 * screenshot. Fixed devices ignore the screenshot; adaptive devices change
 * their screen height (browser) or take the screenshot size (frameless).
 */
export function resolveDeviceGeometry(device: DeviceDefinition, screenshot: Size | null): ResolvedDeviceGeometry {
  const { layout, frame, screen } = device;
  const fullFrame: Rect = { x: 0, y: 0, width: frame.width, height: frame.height };

  if (layout.type === "screenshot") {
    const size = screenshot ?? layout.defaultSize;
    const radius = Math.round(Math.min(size.width, size.height) * layout.radiusRatio);
    const rect = { x: 0, y: 0, width: size.width, height: size.height };
    return {
      width: size.width,
      height: size.height,
      screen: { ...rect, radius },
      body: [{ ...rect, radius }],
      frameSlices: [],
    };
  }

  if (layout.type === "stretch-y") {
    const targetHeight = screenshot ? (screen.width * screenshot.height) / screenshot.width : screen.height;
    const screenHeight = clamp(targetHeight, layout.minScreenHeight, layout.maxScreenHeight);
    const delta = screenHeight - screen.height;
    const middleSrc = layout.end - layout.start;
    const shift = (r: RoundedRect): RoundedRect => {
      const top = r.y > layout.end ? r.y + delta : r.y;
      const bottom = r.y + r.height >= layout.end ? r.y + r.height + delta : r.y + r.height;
      return { ...r, y: top, height: bottom - top };
    };
    return {
      width: frame.width,
      height: frame.height + delta,
      screen: shift(screen),
      body: device.body.map(shift),
      frameSlices: [
        {
          src: { x: 0, y: 0, width: frame.width, height: layout.start },
          dest: { x: 0, y: 0, width: frame.width, height: layout.start },
        },
        {
          src: { x: 0, y: layout.start, width: frame.width, height: middleSrc },
          dest: { x: 0, y: layout.start, width: frame.width, height: middleSrc + delta },
        },
        {
          src: { x: 0, y: layout.end, width: frame.width, height: frame.height - layout.end },
          dest: { x: 0, y: layout.end + delta, width: frame.width, height: frame.height - layout.end },
        },
      ],
    };
  }

  return {
    width: frame.width,
    height: frame.height,
    screen,
    body: device.body,
    frameSlices: [{ src: fullFrame, dest: fullFrame }],
  };
}

/** Frame-to-canvas scale at which the device fits the canvas with padding. */
export function fitScale(geometry: Size, canvas: Size): number {
  const availableW = canvas.width * (1 - FIT_PADDING * 2);
  const availableH = canvas.height * (1 - FIT_PADDING * 2);
  return Math.min(availableW / geometry.width, availableH / geometry.height);
}

export type DeviceTransform = {
  /** Centre in canvas pixels. */
  x: number;
  y: number;
  /** Frame-to-canvas scale. */
  scale: number;
  rotation: number;
};

/** Converts the stored relative transform into absolute canvas units. */
export function deviceTransform(instance: DeviceInstance, geometry: Size, canvas: CanvasConfig): DeviceTransform {
  return {
    x: instance.x * canvas.width,
    y: instance.y * canvas.height,
    scale: instance.scale * fitScale(geometry, canvas),
    rotation: instance.rotation,
  };
}

/** Inverse of {@link deviceTransform}: absolute canvas units → stored values. */
export function relativeTransform(
  absolute: DeviceTransform,
  geometry: Size,
  canvas: CanvasConfig,
): Pick<DeviceInstance, "x" | "y" | "scale" | "rotation"> {
  return {
    x: absolute.x / canvas.width,
    y: absolute.y / canvas.height,
    scale: absolute.scale / fitScale(geometry, canvas),
    rotation: normalizeRotation(absolute.rotation),
  };
}

export function fitRect(image: Size, box: Size, mode: "cover" | "contain"): Rect {
  const scale =
    mode === "cover"
      ? Math.max(box.width / image.width, box.height / image.height)
      : Math.min(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: (box.width - width) / 2, y: (box.height - height) / 2, width, height };
}

export function cornerRadii(radius: CornerRadius): [number, number, number, number] {
  return typeof radius === "number" ? [radius, radius, radius, radius] : radius;
}

type PathContext = Pick<CanvasRenderingContext2D, "moveTo" | "lineTo" | "arcTo" | "closePath">;

/** Adds a rounded rectangle sub-path to a 2D context (no beginPath). */
export function traceRoundedRect(ctx: PathContext, rect: RoundedRect): void {
  const { x, y, width: w, height: h } = rect;
  const max = Math.min(w, h) / 2;
  const [tl, tr, br, bl] = cornerRadii(rect.radius).map((r) => Math.max(0, Math.min(r, max)));
  ctx.moveTo(x + tl!, y);
  ctx.lineTo(x + w - tr!, y);
  ctx.arcTo(x + w, y, x + w, y + tr!, tr!);
  ctx.lineTo(x + w, y + h - br!);
  ctx.arcTo(x + w, y + h, x + w - br!, y + h, br!);
  ctx.lineTo(x + bl!, y + h);
  ctx.arcTo(x, y + h, x, y + h - bl!, bl!);
  ctx.lineTo(x, y + tl!);
  ctx.arcTo(x, y, x + tl!, y, tl!);
  ctx.closePath();
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Normalises an angle to (-180, 180]. */
function normalizeRotation(degrees: number): number {
  let r = ((degrees % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return Math.round(r * 100) / 100;
}

/**
 * Corners of a device as drawn: the frame rectangle, or its projection when
 * a perspective preset is active, turned by `rotation` around the centre and
 * scaled by `scale` (output units per frame unit), relative to the centre.
 */
export function deviceOutline(
  geometry: Size,
  perspective: PerspectiveId,
  rotation: number,
  scale: number,
): { x: number; y: number }[] {
  const local =
    perspective === "front"
      ? [
          { x: 0, y: 0 },
          { x: geometry.width, y: 0 },
          { x: geometry.width, y: geometry.height },
          { x: 0, y: geometry.height },
        ]
      : projectRect(geometry.width, geometry.height, getPerspectivePreset(perspective)).corners;
  const radians = (rotation * Math.PI) / 180;
  const [sin, cos] = [Math.sin(radians), Math.cos(radians)];
  return local.map((p) => {
    const x = (p.x - geometry.width / 2) * scale;
    const y = (p.y - geometry.height / 2) * scale;
    return { x: x * cos - y * sin, y: x * sin + y * cos };
  });
}

export function boundsOf(points: { x: number; y: number }[]): Rect {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/**
 * Where the screenshot is drawn inside the screen: it covers the screen,
 * `crop.zoom` enlarges it, and `crop.x`/`crop.y` pick the visible part
 * (0 = left/top edge, 1 = right/bottom edge).
 */
export function croppedImageRect(image: Size, screen: Rect, crop: ScreenshotCrop): Rect {
  const scale = Math.max(screen.width / image.width, screen.height / image.height) * Math.max(1, crop.zoom);
  const width = image.width * scale;
  const height = image.height * scale;
  return {
    x: screen.x + (screen.width - width) * clamp(crop.x, 0, 1),
    y: screen.y + (screen.height - height) * clamp(crop.y, 0, 1),
    width,
    height,
  };
}

/**
 * Moves the cropped screenshot by `dx`/`dy` (screen units). Axes where the
 * screenshot doesn't overflow the screen can't move.
 */
export function panCrop(crop: ScreenshotCrop, image: Size, screen: Rect, dx: number, dy: number): ScreenshotCrop {
  const rect = croppedImageRect(image, screen, crop);
  const overflowX = screen.width - rect.width;
  const overflowY = screen.height - rect.height;
  return {
    ...crop,
    x: Math.abs(overflowX) > 1e-6 ? clamp(clamp(crop.x, 0, 1) + dx / overflowX, 0, 1) : crop.x,
    y: Math.abs(overflowY) > 1e-6 ? clamp(clamp(crop.y, 0, 1) + dy / overflowY, 0, 1) : crop.y,
  };
}

/** True when the screenshot overflows the screen horizontally / vertically and can be panned. */
export function cropOverflow(crop: ScreenshotCrop, image: Size, screen: Rect): { x: boolean; y: boolean } {
  const rect = croppedImageRect(image, screen, crop);
  return { x: rect.width - screen.width > 0.5, y: rect.height - screen.height > 0.5 };
}

/**
 * CSS `matrix3d()` that maps a `width × height` box (origin top-left, with
 * `transform-origin: 0 0`) onto an arbitrary quad: top-left, top-right,
 * bottom-right, bottom-left. Used to lay HTML over projected devices.
 */
export function quadToCssMatrix(
  width: number,
  height: number,
  quad: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }, { x: number; y: number }],
): string {
  const [p0, p1, p2, p3] = quad;
  // Unit square → quad (Heckbert's projective mapping).
  const dx1 = p1.x - p2.x;
  const dx2 = p3.x - p2.x;
  const dx3 = p0.x - p1.x + p2.x - p3.x;
  const dy1 = p1.y - p2.y;
  const dy2 = p3.y - p2.y;
  const dy3 = p0.y - p1.y + p2.y - p3.y;
  const den = dx1 * dy2 - dx2 * dy1 || 1e-9;
  const g = (dx3 * dy2 - dx2 * dy3) / den;
  const h = (dx1 * dy3 - dx3 * dy1) / den;
  const a = p1.x - p0.x + g * p1.x;
  const b = p3.x - p0.x + h * p3.x;
  const d = p1.y - p0.y + g * p1.y;
  const e = p3.y - p0.y + h * p3.y;
  // Box pixels → unit square, then column-major for CSS.
  const m = [a / width, d / width, 0, g / width, b / height, e / height, 0, h / height, 0, 0, 1, 0, p0.x, p0.y, 0, 1];
  return `matrix3d(${m.map((v) => +v.toPrecision(12)).join(",")})`;
}
