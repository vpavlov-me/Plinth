import type { GradientConfig } from "@/editor/types";

/** CSS equivalent of a gradient background, for swatches and previews. */
export function linearGradientCss(gradient: Pick<GradientConfig, "colors" | "angle">): string {
  return `linear-gradient(${gradient.angle}deg, ${gradient.colors.join(", ")})`;
}
