import { getDevice } from "@/editor/devices/definitions";
import { boundsOf, cornerRadii, deviceTransform, resolveDeviceGeometry, type DeviceTransform } from "@/editor/geometry";
import { getPerspectivePreset, perspectiveProjector } from "@/editor/presets/perspective-presets";
import type { AssetSizeLookup } from "@/editor/scene";
import type { DeviceInstance, Rect, ResolvedDeviceGeometry, Scene } from "@/editor/types";

export type Point = { x: number; y: number };
export type Quad = [Point, Point, Point, Point];

/**
 * Maps a point in the device's local units (frame origin top-left) to canvas
 * pixels — through the perspective preset, exactly like the artwork, then
 * the device's scale, rotation and position.
 */
export function deviceToCanvas(
  instance: DeviceInstance,
  geometry: ResolvedDeviceGeometry,
  transform: DeviceTransform,
): (x: number, y: number) => Point {
  const project =
    instance.perspective === "front"
      ? (x: number, y: number) => ({ x, y })
      : perspectiveProjector(geometry.width, geometry.height, getPerspectivePreset(instance.perspective));
  const angle = (transform.rotation * Math.PI) / 180;
  const [sin, cos] = [Math.sin(angle), Math.cos(angle)];
  return (x, y) => {
    const p = project(x, y);
    const lx = (p.x - geometry.width / 2) * transform.scale;
    const ly = (p.y - geometry.height / 2) * transform.scale;
    return { x: transform.x + lx * cos - ly * sin, y: transform.y + lx * sin + ly * cos };
  };
}

/** Corners of a local rectangle, clockwise from top-left, in canvas pixels. */
export function rectQuad(
  map: (x: number, y: number) => Point,
  rect: { x: number; y: number; width: number; height: number },
): Quad {
  return [
    map(rect.x, rect.y),
    map(rect.x + rect.width, rect.y),
    map(rect.x + rect.width, rect.y + rect.height),
    map(rect.x, rect.y + rect.height),
  ];
}

/** Share of a device's screen that devices in front may cover before it gets no upload prompt. */
const MAX_COVERED = 0.5;

export type UploadPrompt = {
  id: string;
  /** Outlines (canvas pixels) of the devices drawn in front of it, to clip the prompt by. */
  inFront: Point[][];
  /** True when devices in front cover part of the screen: the prompt shrinks to its icon. */
  partlyCovered: boolean;
};

/**
 * Devices that show the upload prompt: every device without a screenshot
 * whose screen is mostly visible. The prompt is an HTML overlay, so it is
 * clipped by the devices in front of it. The front-most empty device always
 * gets one.
 */
export function uploadPrompts(scene: Pick<Scene, "devices" | "canvas">, sizeOf: AssetSizeLookup): UploadPrompt[] {
  const layouts = scene.devices.map((instance) => {
    const geometry = resolveDeviceGeometry(
      getDevice(instance.deviceId),
      instance.screenshotId ? sizeOf(instance.screenshotId) : null,
    );
    const map = deviceToCanvas(instance, geometry, deviceTransform(instance, geometry, scene.canvas));
    const screenQuad = rectQuad(map, geometry.screen);
    return {
      instance,
      outline: frameOutline(geometry).map((p) => map(p.x, p.y)),
      screen: boundsOf(screenQuad),
      screenCenter: map(geometry.screen.x + geometry.screen.width / 2, geometry.screen.y + geometry.screen.height / 2),
    };
  });
  const frontEmpty = scene.devices.findLast((d) => d.screenshotId === null)?.id;
  const prompts: UploadPrompt[] = [];
  layouts.forEach(({ instance, screen, screenCenter }, index) => {
    if (instance.screenshotId !== null) return;
    const inFront = layouts.slice(index + 1).map((l) => l.outline);
    const covered = inFront.reduce((sum, outline) => sum + overlapArea(screen, boundsOf(outline)), 0);
    const centreHidden = inFront.some((outline) => insidePolygon(screenCenter, outline));
    if (instance.id !== frontEmpty && (centreHidden || covered >= MAX_COVERED * screen.width * screen.height)) return;
    prompts.push({ id: instance.id, inFront, partlyCovered: covered > 0 });
  });
  return prompts;
}

/**
 * The frame as a rounded rectangle in local units. The corner radius is
 * estimated from the screen's radius plus the bezel around it.
 */
function frameOutline(geometry: ResolvedDeviceGeometry): Point[] {
  const { width, height, screen } = geometry;
  const screenRadius = Math.max(...cornerRadii(screen.radius));
  const bezel = Math.max(0, Math.min(screen.x, screen.y));
  const r = Math.min(screenRadius > 0 ? screenRadius + bezel : 0, width / 2, height / 2);
  if (r <= 0) return rectQuad((x, y) => ({ x, y }), { x: 0, y: 0, width, height });
  const corners = [
    { cx: r, cy: r, start: Math.PI },
    { cx: width - r, cy: r, start: Math.PI * 1.5 },
    { cx: width - r, cy: height - r, start: 0 },
    { cx: r, cy: height - r, start: Math.PI / 2 },
  ];
  const steps = 6;
  return corners.flatMap(({ cx, cy, start }) =>
    Array.from({ length: steps + 1 }, (_, i) => {
      const a = start + (i / steps) * (Math.PI / 2);
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
    }),
  );
}

function overlapArea(a: Rect, b: Rect): number {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > 0 && height > 0 ? width * height : 0;
}

function insidePolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

/** CSS clip-path that keeps a `width × height` box except one polygon (scaled by `scale`). */
export function clipOutPolygon(width: number, height: number, polygon: Point[], scale: number): string {
  const hole = polygon.map((p) => `${(p.x * scale).toFixed(1)} ${(p.y * scale).toFixed(1)}`).join(" L");
  return `path(evenodd, "M0 0 H${width} V${height} H0 Z M${hole} Z")`;
}
