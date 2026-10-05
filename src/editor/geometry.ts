import type {
  CanvasConfig,
  CornerRadius,
  DeviceDefinition,
  DeviceInstance,
  Rect,
  ResolvedDeviceGeometry,
  RoundedRect,
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

/** "Cover" placement of an image inside a box, aligned to the top edge. */
export function coverTopRect(image: Size, box: Rect): Rect {
  const scale = Math.max(box.width / image.width, box.height / image.height);
  const width = image.width * scale;
  const height = image.height * scale;
  return { x: box.x + (box.width - width) / 2, y: box.y, width, height };
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
export function normalizeRotation(degrees: number): number {
  let r = ((degrees % 360) + 360) % 360;
  if (r > 180) r -= 360;
  return Math.round(r * 100) / 100;
}
