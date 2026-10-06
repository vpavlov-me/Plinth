"use client";

import { Info, Keyboard, Monitor, Moon, Redo2, RotateCcw, Sun, Undo2 } from "lucide-react";
import { useEffect } from "react";
import { ExportMenu } from "@/components/editor/export-menu";
import { Button, IconButton } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { resetProject } from "@/editor/actions";
import { useCanRedo, useCanUndo, useEditorStore } from "@/editor/store";
import { useThemeStore, type ThemePreference } from "@/editor/theme";
import { useUIStore } from "@/editor/ui-store";
import { modKey } from "@/lib/platform";

export function EditorToolbar() {
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const setDialog = useUIStore((s) => s.setDialog);

  return (
    <header className="relative flex h-14 shrink-0 items-center gap-2 px-4">
      <div className="flex items-center gap-2 pr-2">
        <Logo />
        <h1 className="text-[13px] font-semibold tracking-tight">
          Plinth<span className="sr-only"> — device mockup generator for screenshots</span>
        </h1>
      </div>

      <div className="flex-1" />

      <ThemeToggle />
      <IconButton label="Keyboard shortcuts" shortcut="?" icon={<Keyboard />} onClick={() => setDialog("shortcuts")} />
      <IconButton label="About Plinth" icon={<Info />} onClick={() => setDialog("about")} />
      <div className="mx-1 h-5 w-px bg-line" aria-hidden />
      <IconButton label="Undo" shortcut={`${modKey()}Z`} icon={<Undo2 />} disabled={!canUndo} onClick={undo} />
      <IconButton label="Redo" shortcut={`${modKey()}⇧Z`} icon={<Redo2 />} disabled={!canRedo} onClick={redo} />
      <div className="mx-1 h-5 w-px bg-line" aria-hidden />
      <Tooltip label="Start over: default scene, no screenshots">
        <Button variant="ghost" aria-label="Reset project" className="text-muted hover:text-ink" onClick={resetProject}>
          <RotateCcw className="size-4" />
          Reset
        </Button>
      </Tooltip>
      <ExportMenu />
    </header>
  );
}

const THEME_LABELS: Record<ThemePreference, string> = {
  system: "Theme: system",
  light: "Theme: light",
  dark: "Theme: dark",
};
const THEME_ICONS: Record<ThemePreference, React.ReactNode> = {
  system: <Monitor />,
  light: <Sun />,
  dark: <Moon />,
};

/** Cycles System → Light → Dark. */
function ThemeToggle() {
  const preference = useThemeStore((s) => s.preference);
  const load = useThemeStore((s) => s.load);
  const cycle = useThemeStore((s) => s.cycle);

  useEffect(() => {
    if (preference === null) load();
  }, [preference, load]);

  const current = preference ?? "system";
  return <IconButton label={THEME_LABELS[current]} icon={THEME_ICONS[current]} onClick={cycle} />;
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
