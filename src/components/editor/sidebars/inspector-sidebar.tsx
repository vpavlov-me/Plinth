"use client";

import { BackgroundPanel } from "@/components/editor/panels/background-panel";
import { CanvasPanel } from "@/components/editor/panels/canvas-panel";
import { DevicePanel } from "@/components/editor/panels/device-panel";
import { PerspectivePanel } from "@/components/editor/panels/perspective-panel";
import { ScreenshotPanel } from "@/components/editor/panels/screenshot-panel";
import { ShadowPanel } from "@/components/editor/panels/shadow-panel";

/**
 * Inspector: the canvas first, then what the device shows (Screenshot), what
 * it is (Mockup), the scene around it (Background) and finally its look
 * (Shadow, Perspective).
 */
export function InspectorSidebar() {
  return (
    <aside
      aria-label="Properties"
      className="flex h-full w-[300px] shrink-0 scrollbar-thin flex-col overflow-y-auto rounded-2xl bg-panel shadow-panel"
    >
      <CanvasPanel />
      <ScreenshotPanel />
      <DevicePanel />
      <BackgroundPanel />
      <ShadowPanel />
      <PerspectivePanel />
    </aside>
  );
}
