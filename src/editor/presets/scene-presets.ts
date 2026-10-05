import { GRADIENT_PRESETS } from "@/editor/presets/background-presets";
import { SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import type { BackgroundConfig, CanvasConfig, DeviceInstance } from "@/editor/types";

/**
 * Scene presets configure the canvas, the background and (optionally) the
 * devices in one step. They never touch screenshots.
 */
export type ScenePreset = {
  id: string;
  name: string;
  description: string;
  canvas: CanvasConfig;
  background: BackgroundConfig;
  device?: Partial<Pick<DeviceInstance, "deviceId" | "x" | "y" | "scale" | "rotation" | "shadow">>;
};

const gradient = (id: string): BackgroundConfig => {
  const preset = GRADIENT_PRESETS.find((p) => p.id === id) ?? GRADIENT_PRESETS[0]!;
  return { ...preset.gradient, colors: [...preset.gradient.colors] };
};

export const SCENE_PRESETS: ScenePreset[] = [
  {
    id: "product-hunt",
    name: "Product Hunt",
    description: "1270 × 760 gallery",
    canvas: { width: 1270, height: 760, preset: "custom" },
    background: gradient("peach"),
    device: { x: 0.5, y: 0.5, scale: 1, rotation: 0, shadow: SHADOW_PRESETS.medium },
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    description: "1200 × 1200 post",
    canvas: { width: 1200, height: 1200, preset: "square" },
    background: gradient("mist"),
    device: { x: 0.5, y: 0.5, scale: 1, rotation: 0, shadow: SHADOW_PRESETS.soft },
  },
  {
    id: "app-store",
    name: "App Store",
    description: "1290 × 2796 phone",
    canvas: { width: 1290, height: 2796, preset: "custom" },
    background: gradient("lagoon"),
    device: { deviceId: "phone", x: 0.5, y: 0.56, scale: 0.86, rotation: 0, shadow: SHADOW_PRESETS.medium },
  },
  {
    id: "portfolio-hero",
    name: "Portfolio Hero",
    description: "1920 × 1080 hero",
    canvas: { width: 1920, height: 1080, preset: "landscape" },
    background: { type: "solid", color: "#f4f4f5" },
    device: { x: 0.5, y: 0.5, scale: 1, rotation: 0, shadow: SHADOW_PRESETS.soft },
  },
  {
    id: "instagram",
    name: "Instagram",
    description: "1080 × 1350 portrait",
    canvas: { width: 1080, height: 1350, preset: "portrait" },
    background: gradient("lilac"),
    device: { x: 0.5, y: 0.5, scale: 1, rotation: 0, shadow: SHADOW_PRESETS.medium },
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "1920 × 1080 dark slide",
    canvas: { width: 1920, height: 1080, preset: "landscape" },
    background: gradient("ink"),
    device: { x: 0.5, y: 0.5, scale: 1, rotation: 0, shadow: SHADOW_PRESETS.strong },
  },
];
