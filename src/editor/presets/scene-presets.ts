import { cloneGradient, GRADIENT_PRESETS } from "@/editor/presets/background-presets";
import { SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import type { BackgroundConfig, CanvasConfig, DeviceInstance, PerspectiveId, ShadowConfig } from "@/editor/types";

/**
 * Scene presets configure the canvas and, optionally, the background, a
 * layout and the device look in one step. They never touch screenshots.
 * Platform names are only used to describe the target size.
 */
export type ScenePreset = {
  id: string;
  name: string;
  description: string;
  group: "social" | "showcase";
  canvas: CanvasConfig;
  /** Omitted: the current background is kept. */
  background?: BackgroundConfig;
  /** Layout preset id; omitted: the devices keep their arrangement (a single device is centred). */
  layout?: string;
  /** Model for the primary device, applied before the layout. */
  deviceId?: string;
  /** Applied to every device. */
  perspective?: PerspectiveId;
  shadow?: ShadowConfig;
  /** Placement of a single device (a showcase with room for a headline). */
  transform?: Pick<DeviceInstance, "x" | "y" | "scale" | "rotation">;
};

export const SCENE_PRESET_GROUPS: { id: ScenePreset["group"]; label: string }[] = [
  { id: "social", label: "Social" },
  { id: "showcase", label: "Showcase" },
];

const gradient = (id: string): BackgroundConfig => {
  const preset = GRADIENT_PRESETS.find((p) => p.id === id) ?? GRADIENT_PRESETS[0]!;
  return cloneGradient(preset.gradient);
};

const social = (id: string, name: string, width: number, height: number): ScenePreset => ({
  id,
  name,
  description: `${width} × ${height}`,
  group: "social",
  canvas: { width, height, preset: "custom" },
});

export const SCENE_PRESETS: ScenePreset[] = [
  social("instagram-post", "Instagram post", 1080, 1080),
  social("instagram-portrait", "Instagram portrait", 1080, 1350),
  social("instagram-story", "Instagram / TikTok story", 1080, 1920),
  social("x-post", "X post", 1600, 900),
  social("linkedin-post", "LinkedIn post", 1200, 1200),
  social("linkedin-link", "LinkedIn / Facebook link", 1200, 627),
  social("facebook-post", "Facebook post", 1200, 630),
  social("pinterest-pin", "Pinterest pin", 1000, 1500),
  social("youtube-thumbnail", "YouTube thumbnail", 1280, 720),
  social("threads-post", "Threads post", 1080, 1350),
  social("dribbble-shot", "Dribbble shot", 1600, 1200),
  social("behance-cover", "Behance cover", 1616, 1264),
  social("og-image", "Open Graph image", 1200, 630),
  {
    id: "product-hunt",
    name: "Product Hunt",
    description: "1270 × 760 · two phones",
    group: "showcase",
    canvas: { width: 1270, height: 760, preset: "custom" },
    background: gradient("pink-orange"),
    layout: "duo",
    perspective: "tilt-left",
    shadow: SHADOW_PRESETS.medium,
  },
  {
    id: "app-store",
    name: "App Store",
    description: "1290 × 2796 · phone",
    group: "showcase",
    canvas: { width: 1290, height: 2796, preset: "custom" },
    background: gradient("liquid-mint"),
    layout: "solo",
    deviceId: "phone-pro",
    perspective: "front",
    shadow: SHADOW_PRESETS.medium,
    transform: { x: 0.5, y: 0.56, scale: 0.86, rotation: 0 },
  },
  {
    id: "google-play-feature",
    name: "Google Play feature",
    description: "1024 × 500 graphic",
    group: "showcase",
    canvas: { width: 1024, height: 500, preset: "custom" },
    background: gradient("sky-indigo"),
    layout: "solo",
    perspective: "front",
    shadow: SHADOW_PRESETS.soft,
  },
  {
    id: "portfolio-hero",
    name: "Portfolio hero",
    description: "1920 × 1080 · laptop + phone",
    group: "showcase",
    canvas: { width: 1920, height: 1080, preset: "landscape" },
    background: gradient("liquid-blue"),
    layout: "laptop-phone",
    shadow: SHADOW_PRESETS.medium,
  },
  {
    id: "presentation",
    name: "Presentation",
    description: "1920 × 1080 dark slide",
    group: "showcase",
    canvas: { width: 1920, height: 1080, preset: "landscape" },
    background: gradient("blue-hour"),
    layout: "solo",
    perspective: "front",
    shadow: SHADOW_PRESETS.strong,
  },
];
