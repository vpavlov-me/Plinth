import type { ShadowConfig, ShadowPresetId } from "@/editor/types";

type NamedShadowPreset = Exclude<ShadowPresetId, "custom">;

export const SHADOW_PRESETS: Record<NamedShadowPreset, ShadowConfig> = {
  none: { preset: "none", blur: 0, opacity: 0, offsetX: 0, offsetY: 0 },
  soft: { preset: "soft", blur: 60, opacity: 0.16, offsetX: 0, offsetY: 24 },
  medium: { preset: "medium", blur: 90, opacity: 0.26, offsetX: 0, offsetY: 40 },
  strong: { preset: "strong", blur: 120, opacity: 0.4, offsetX: 0, offsetY: 60 },
};

export const SHADOW_PRESET_LABELS: Record<NamedShadowPreset, string> = {
  none: "None",
  soft: "Soft",
  medium: "Medium",
  strong: "Strong",
};

export const DEFAULT_SHADOW: ShadowConfig = SHADOW_PRESETS.soft;

export function isShadowVisible(shadow: ShadowConfig): boolean {
  return shadow.preset !== "none" && shadow.opacity > 0;
}

/**
 * A shadow is rendered as two layers: the configured ambient shadow plus a
 * tighter "contact" shadow derived from it, which grounds the device and
 * avoids the flat look of a single large blur.
 */
export function shadowLayers(shadow: ShadowConfig): Omit<ShadowConfig, "preset">[] {
  if (!isShadowVisible(shadow)) return [];
  return [
    { blur: shadow.blur, opacity: shadow.opacity, offsetX: shadow.offsetX, offsetY: shadow.offsetY },
    {
      blur: Math.max(4, shadow.blur * 0.15),
      opacity: Math.min(1, shadow.opacity * 0.55),
      offsetX: shadow.offsetX * 0.12,
      offsetY: shadow.offsetY * 0.12,
    },
  ];
}
