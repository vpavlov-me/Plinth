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
    // Ellipse radii as a share of the box (CSS can't turn them; fine for previews).
    const radius = b.r * Math.max(w, h);
    const stretch = b.stretch ?? 1;
    const rx = Math.round(((radius * stretch) / w) * 100);
    const ry = Math.round((radius / h) * 100);
    const core = Math.round(Math.max(0, Math.min(0.9, b.core ?? 0)) * 100);
    const mid = Math.round(core + (100 - core) * 0.55);
    return `radial-gradient(ellipse ${rx}% ${ry}% at ${b.x * 100}% ${b.y * 100}%, ${b.color} 0%, ${b.color} ${core}%, ${solid}88 ${mid}%, ${solid}00 100%)`;
  });
  return [...layers, base].join(", ");
}
