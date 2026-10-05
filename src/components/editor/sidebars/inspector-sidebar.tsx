"use client";

import { BackgroundPanel } from "@/components/editor/panels/background-panel";
import { DevicePanel } from "@/components/editor/panels/device-panel";
import { ShadowPanel } from "@/components/editor/panels/shadow-panel";

export function InspectorSidebar() {
  return (
    <aside
      aria-label="Properties"
      className="flex w-[300px] shrink-0 scrollbar-thin flex-col overflow-y-auto rounded-2xl bg-panel shadow-panel"
    >
      <DevicePanel />
      <BackgroundPanel />
      <ShadowPanel />
    </aside>
  );
}
