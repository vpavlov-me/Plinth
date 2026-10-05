import type { PerspectiveId } from "@/editor/types";

/**
 * Predefined 2.5D treatments. Each one turns the flat device in 3D space and
 * projects it back with a fixed camera, so users pick a look instead of
 * handling cameras or angles.
 */
export type PerspectivePreset = {
  id: PerspectiveId;
  name: string;
  /** Degrees. Positive X tips the top edge away from the viewer. */
  rotateX: number;
  /** Degrees. Positive Y turns the right edge away from the viewer. */
  rotateY: number;
  /** Degrees, clockwise, applied after the 3D turn. */
  rotateZ: number;
};

/** Camera distance as a multiple of the device's longer side. */
export const CAMERA_DISTANCE = 2.4;

export const PERSPECTIVE_PRESETS: PerspectivePreset[] = [
  { id: "front", name: "Front", rotateX: 0, rotateY: 0, rotateZ: 0 },
  { id: "tilt-left", name: "Tilt Left", rotateX: 8, rotateY: 18, rotateZ: 0 },
  { id: "tilt-right", name: "Tilt Right", rotateX: 8, rotateY: -18, rotateZ: 0 },
  { id: "perspective-left", name: "Perspective Left", rotateX: 26, rotateY: 26, rotateZ: -10 },
  { id: "perspective-right", name: "Perspective Right", rotateX: 26, rotateY: -26, rotateZ: 10 },
];

export const PERSPECTIVE_IDS = PERSPECTIVE_PRESETS.map((p) => p.id);

export function getPerspectivePreset(id: PerspectiveId): PerspectivePreset {
  return PERSPECTIVE_PRESETS.find((p) => p.id === id) ?? PERSPECTIVE_PRESETS[0]!;
}

export function isPerspectiveId(value: unknown): value is PerspectiveId {
  return typeof value === "string" && (PERSPECTIVE_IDS as string[]).includes(value);
}

/** A projected corner: canvas-plane position plus the homogeneous depth used for perspective-correct texturing. */
export type ProjectedPoint = { x: number; y: number; w: number };

export type Projection = {
  /** Top-left, top-right, bottom-right, bottom-left, in the device's local units. */
  corners: [ProjectedPoint, ProjectedPoint, ProjectedPoint, ProjectedPoint];
  bounds: { x: number; y: number; width: number; height: number };
};

/**
 * Projects a `width × height` rectangle (local units, origin top-left) through
 * the preset. The rectangle's centre stays fixed and keeps its scale, so a
 * device changes look but not position when switching presets.
 */
export function projectRect(width: number, height: number, preset: PerspectivePreset): Projection {
  const project = perspectiveProjector(width, height, preset);
  const corners: Projection["corners"] = [project(0, 0), project(width, 0), project(width, height), project(0, height)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  return {
    corners,
    bounds: { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY },
  };
}

/**
 * Projects any point of a `width × height` rectangle (local units, origin
 * top-left) through the preset — the same projection used for the device
 * artwork, so overlays such as the upload prompt can follow it exactly.
 */
export function perspectiveProjector(
  width: number,
  height: number,
  preset: PerspectivePreset,
): (px: number, py: number) => ProjectedPoint {
  const rad = Math.PI / 180;
  const [sx, cx] = [Math.sin(preset.rotateX * rad), Math.cos(preset.rotateX * rad)];
  const [sy, cy] = [Math.sin(preset.rotateY * rad), Math.cos(preset.rotateY * rad)];
  const [sz, cz] = [Math.sin(preset.rotateZ * rad), Math.cos(preset.rotateZ * rad)];
  const distance = CAMERA_DISTANCE * Math.max(width, height);

  return (px: number, py: number): ProjectedPoint => {
    // Centre the rectangle; z points towards the viewer.
    let x = px - width / 2;
    let y = py - height / 2;
    let z = 0;
    // Tip around X: the top edge (negative y) moves away for positive angles.
    [y, z] = [y * cx - z * sx, y * sx + z * cx];
    // Turn around Y: the right edge (positive x) moves away for positive angles.
    [x, z] = [x * cy + z * sy, -x * sy + z * cy];
    // Roll in the picture plane.
    [x, y] = [x * cz - y * sz, x * sz + y * cz];
    const w = (distance - z) / distance;
    return { x: width / 2 + x / w, y: height / 2 + y / w, w };
  };
}
