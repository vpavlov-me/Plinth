"use client";

import { BackgroundPanel } from "@/components/editor/panels/background-panel";
import { CanvasPanel } from "@/components/editor/panels/canvas-panel";
import { DevicePanel } from "@/components/editor/panels/device-panel";
import { PerspectivePanel } from "@/components/editor/panels/perspective-panel";
import { ScreenshotPanel } from "@/components/editor/panels/screenshot-panel";
import { ShadowPanel } from "@/components/editor/panels/shadow-panel";

/**
 * Inspector, ordered from the selected device outwards: what it is
 * (Mockup), what it shows (Screenshot), how it's posed (Perspective, Shadow),
 * then the scene around it (Canvas size, Background).
 */
export function InspectorSidebar() {
  return (
    <aside
      aria-label="Properties"
      className="flex h-full w-[300px] shrink-0 scrollbar-thin flex-col overflow-y-auto rounded-2xl bg-panel shadow-panel"
    >
      <DevicePanel />
      <ScreenshotPanel />
      <PerspectivePanel />
      <ShadowPanel />
      <div role="separator" className="mx-4 my-1.5 h-px shrink-0 bg-line" />
      <CanvasPanel />
      <BackgroundPanel />
    </aside>
  );
}
