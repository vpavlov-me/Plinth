"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronRight } from "lucide-react";
import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { SliderField } from "@/components/ui/slider-field";
import { SHADOW_PRESET_LABELS, SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import { updateDevice } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore } from "@/editor/store";
import type { ShadowConfig } from "@/editor/types";

type PresetChoice = keyof typeof SHADOW_PRESETS;
const CHOICES = Object.keys(SHADOW_PRESETS) as PresetChoice[];

export function ShadowPanel() {
  const activeId = useActiveDeviceId();
  const instance = useDevice(activeId);
  const update = useEditorStore((s) => s.update);
  const commit = useEditorStore((s) => s.commit);
  if (!instance) return null;

  const { shadow } = instance;
  const setShadow = (next: ShadowConfig, transient = false) =>
    update((scene) => updateDevice(scene, instance.id, { shadow: next }), { transient });
  // Editing a value turns the shadow into a custom one.
  const tweak = (patch: Partial<ShadowConfig>) => {
    const base = shadow.preset === "none" ? SHADOW_PRESETS.soft : shadow;
    setShadow({ ...base, ...patch, preset: "custom" }, true);
  };

  return (
    <Section title="Shadow">
      <Segmented<PresetChoice | "custom">
        label="Shadow preset"
        value={shadow.preset}
        onChange={(preset) => {
          if (preset !== "custom") setShadow({ ...SHADOW_PRESETS[preset] });
        }}
        options={CHOICES.map((id) => ({ value: id, label: SHADOW_PRESET_LABELS[id] }))}
      />
      <Collapsible.Root>
        <Collapsible.Trigger className="group flex h-6 cursor-default items-center gap-1 rounded-md text-xs text-muted hover:text-ink">
          <ChevronRight className="size-3.5 transition-transform group-data-[panel-open]:rotate-90" />
          Advanced{shadow.preset === "custom" ? " · custom" : ""}
        </Collapsible.Trigger>
        <Collapsible.Panel className="flex flex-col gap-3 pt-2">
          <SliderField
            label="Blur"
            value={Math.round(shadow.blur)}
            min={0}
            max={300}
            format={(v) => `${v}px`}
            onChange={(blur) => tweak({ blur })}
            onCommit={commit}
          />
          <SliderField
            label="Opacity"
            value={Math.round(shadow.opacity * 100)}
            min={0}
            max={100}
            format={(v) => `${v}%`}
            onChange={(v) => tweak({ opacity: v / 100 })}
            onCommit={commit}
          />
          <SliderField
            label="X offset"
            value={Math.round(shadow.offsetX)}
            min={-200}
            max={200}
            format={(v) => `${v}px`}
            onChange={(offsetX) => tweak({ offsetX })}
            onCommit={commit}
          />
          <SliderField
            label="Y offset"
            value={Math.round(shadow.offsetY)}
            min={-200}
            max={200}
            format={(v) => `${v}px`}
            onChange={(offsetY) => tweak({ offsetY })}
            onCommit={commit}
          />
        </Collapsible.Panel>
      </Collapsible.Root>
    </Section>
  );
}
