"use client";

import { Section } from "@/components/ui/section";
import { Segmented } from "@/components/ui/segmented";
import { SHADOW_PRESET_LABELS, SHADOW_PRESETS } from "@/editor/presets/shadow-presets";
import { updateDevice } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore } from "@/editor/store";

type PresetChoice = keyof typeof SHADOW_PRESETS;
const CHOICES = Object.keys(SHADOW_PRESETS) as PresetChoice[];

/** Shadow strength. Deliberately presets only — no fine-tuning. */
export function ShadowPanel() {
  const activeId = useActiveDeviceId();
  const instance = useDevice(activeId);
  const update = useEditorStore((s) => s.update);
  if (!instance) return null;

  return (
    <Section title="Shadow">
      <Segmented<PresetChoice | "custom">
        label="Shadow"
        value={instance.shadow.preset}
        onChange={(preset) => {
          if (preset === "custom") return;
          update((scene) => updateDevice(scene, instance.id, { shadow: { ...SHADOW_PRESETS[preset] } }));
        }}
        options={CHOICES.map((id) => ({ value: id, label: SHADOW_PRESET_LABELS[id] }))}
      />
    </Section>
  );
}
