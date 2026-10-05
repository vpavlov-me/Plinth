"use client";

import { CanvasPresetPicker } from "@/components/editor/canvas-preset-picker";
import { Section } from "@/components/ui/section";

/** Canvas size: a few common ratios, plus custom dimensions. */
export function CanvasPanel() {
  return (
    <Section title="Canvas">
      <CanvasPresetPicker />
    </Section>
  );
}
