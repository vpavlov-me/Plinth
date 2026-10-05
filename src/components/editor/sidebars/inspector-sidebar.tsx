"use client";

import { BackgroundPanel } from "@/components/editor/panels/background-panel";
import { DevicePanel } from "@/components/editor/panels/device-panel";
import { PerspectivePanel } from "@/components/editor/panels/perspective-panel";
import { ScreenshotPanel } from "@/components/editor/panels/screenshot-panel";
import { ShadowPanel } from "@/components/editor/panels/shadow-panel";

export function InspectorSidebar() {
  return (
    <aside
      aria-label="Properties"
      className="flex h-full w-[300px] shrink-0 scrollbar-thin flex-col overflow-y-auto rounded-2xl bg-panel shadow-panel"
    >
      <DevicePanel />
      <ScreenshotPanel />
      <PerspectivePanel />
      <BackgroundPanel />
      <ShadowPanel />
    </aside>
  );
}
