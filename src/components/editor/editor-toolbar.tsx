"use client";

import { ImagePlus, PanelLeft, PanelRight, Redo2, Undo2 } from "lucide-react";
import { ExportMenu } from "@/components/editor/export-menu";
import { pickImageFile } from "@/components/editor/pick-file";
import { IconButton } from "@/components/ui/button";
import { importScreenshot } from "@/editor/actions";
import { useActiveDeviceId } from "@/editor/selection";
import { useCanRedo, useCanUndo, useEditorStore, useScene } from "@/editor/store";
import { useUIStore } from "@/editor/ui-store";
import { modKey } from "@/lib/platform";

export function EditorToolbar() {
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canvas = useScene((s) => s.canvas);
  const activeId = useActiveDeviceId();
  const panels = useUIStore((s) => s.panels);
  const togglePanel = useUIStore((s) => s.togglePanel);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 px-4">
      <IconButton
        label={panels.library ? "Hide library" : "Show library"}
        shortcut="["
        icon={<PanelLeft />}
        active={panels.library}
        className="-ml-1 hidden xl:inline-flex"
        onClick={() => togglePanel("library")}
      />
      <div className="flex items-center gap-2 pr-2">
        <Logo />
        <h1 className="text-[13px] font-semibold tracking-tight">
          Plinth<span className="sr-only"> — device mockup generator for screenshots</span>
        </h1>
      </div>

      <div className="flex-1" />

      <span className="hidden pr-2 text-xs text-muted tabular-nums sm:inline" aria-live="polite">
        {canvas.width} × {canvas.height}
      </span>
      <IconButton
        label="Open screenshot"
        shortcut={`${modKey()}O`}
        icon={<ImagePlus />}
        onClick={() => pickImageFile((file) => void importScreenshot(file, activeId))}
      />
      <div className="mx-1 h-5 w-px bg-line" aria-hidden />
      <IconButton label="Undo" shortcut={`${modKey()}Z`} icon={<Undo2 />} disabled={!canUndo} onClick={undo} />
      <IconButton label="Redo" shortcut={`${modKey()}⇧Z`} icon={<Redo2 />} disabled={!canRedo} onClick={redo} />
      <div className="mx-1 h-5 w-px bg-line" aria-hidden />
      <ExportMenu />
      <IconButton
        label={panels.inspector ? "Hide properties" : "Show properties"}
        shortcut="]"
        icon={<PanelRight />}
        active={panels.inspector}
        onClick={() => togglePanel("inspector")}
      />
    </header>
  );
}

function Logo() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="6" className="fill-ink" />
      <rect x="8.5" y="5.5" width="7" height="10" rx="1.6" className="fill-chrome" />
      <rect x="6" y="16.5" width="12" height="2" rx="1" className="fill-chrome" opacity="0.7" />
    </svg>
  );
}
