"use client";

import { Section } from "@/components/ui/section";
import { Tooltip } from "@/components/ui/tooltip";
import { getPerspectivePreset, PERSPECTIVE_PRESETS, projectRect } from "@/editor/presets/perspective-presets";
import { setPerspective } from "@/editor/scene";
import { useActiveDeviceId } from "@/editor/selection";
import { useDevice, useEditorStore } from "@/editor/store";
import type { PerspectiveId } from "@/editor/types";
import { cn } from "@/lib/cn";

/** Perspective is a look, not a 3D editor: five presets, no angles or cameras. */
export function PerspectivePanel() {
  const activeId = useActiveDeviceId();
  const instance = useDevice(activeId);
  const update = useEditorStore((s) => s.update);
  if (!instance) return null;
  const current = PERSPECTIVE_PRESETS.find((p) => p.id === instance.perspective);

  return (
    <Section title="Perspective" action={<span className="text-xs text-muted">{current?.name}</span>}>
      <div role="radiogroup" aria-label="Perspective" className="grid grid-cols-5 gap-1">
        {PERSPECTIVE_PRESETS.map((preset) => {
          const selected = instance.perspective === preset.id;
          return (
            <Tooltip key={preset.id} label={preset.name}>
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={preset.name}
                onClick={() => update((scene) => setPerspective(scene, instance.id, preset.id))}
                className={cn(
                  "flex h-11 cursor-default items-center justify-center rounded-lg border transition-colors",
                  selected
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-transparent text-muted hover:bg-hover hover:text-ink",
                )}
              >
                <PerspectiveIcon id={preset.id} />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </Section>
  );
}

/** A phone-shaped quad projected through the preset, so each tile shows its look. */
function PerspectiveIcon({ id }: { id: PerspectiveId }) {
  const { corners } = projectRect(12, 24, getPerspectivePreset(id));
  const points = corners.map((c) => `${(c.x + 6).toFixed(2)},${(c.y + 2).toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 24 28" className="size-7" aria-hidden>
      <polygon
        points={points}
        fill="currentColor"
        fillOpacity={0.18}
        stroke="currentColor"
        strokeWidth={1.4}
        strokeLinejoin="round"
      />
    </svg>
  );
}
