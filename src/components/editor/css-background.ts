import type { GradientConfig } from "@/editor/types";

/**
 * CSS equivalent of a gradient background, for swatches and previews.
 * Mesh lights become radial layers sized for a box of the given aspect
 * ratio (width / height); grain is omitted at thumbnail size.
 */
export function gradientCss(gradient: Pick<GradientConfig, "colors" | "angle" | "blobs">, aspect = 1): string {
  const base = `linear-gradient(${gradient.angle}deg, ${gradient.colors.join(", ")})`;
  if (!gradient.blobs?.length) return base;
  const w = aspect >= 1 ? 1 : aspect;
  const h = aspect >= 1 ? 1 / aspect : 1;
  const layers = gradient.blobs.map((b) => {
    const solid = b.color.slice(0, 7);
    // CSS stops are relative to the distance to the farthest corner.
    const fx = Math.max(b.x, 1 - b.x) * w;
    const fy = Math.max(b.y, 1 - b.y) * h;
    const reach = Math.hypot(fx, fy);
    const stop = (fraction: number) => `${Math.round(((b.r * Math.max(w, h)) / reach) * fraction * 100)}%`;
    return `radial-gradient(circle at ${b.x * 100}% ${b.y * 100}%, ${b.color} 0%, ${solid}88 ${stop(0.55)}, ${solid}00 ${stop(1)})`;
  });
  return [...layers, base].join(", ");
}
