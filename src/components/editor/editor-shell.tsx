"use client";

import { useRef } from "react";
import { Monitor } from "lucide-react";
import { AboutDialog } from "@/components/editor/about-dialog";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { ResetDialog } from "@/components/editor/reset-dialog";
import { InspectorSidebar } from "@/components/editor/sidebars/inspector-sidebar";
import { LibrarySidebar } from "@/components/editor/sidebars/library-sidebar";
import { ShortcutsDialog } from "@/components/editor/shortcuts-dialog";
import { useEditorShortcuts } from "@/components/editor/use-editor-shortcuts";
import { usePersistence } from "@/components/editor/use-persistence";
import { Workspace } from "@/components/editor/workspace";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export function EditorShell() {
  usePersistence();
  useEditorShortcuts();
  const { shellRef, moveSpotlight, hideSpotlight } = useSpotlight();

  return (
    <TooltipProvider delay={400}>
      <Toaster>
        <div
          ref={shellRef}
          className="workspace-bg relative hidden h-dvh flex-col md:flex"
          onPointerMove={moveSpotlight}
          onPointerLeave={hideSpotlight}
        >
          <div className="workspace-spotlight" aria-hidden />
          <EditorToolbar />
          <div className="relative flex min-h-0 flex-1 gap-3 px-3 pb-3">
            <div className="hidden shrink-0 xl:block">
              <LibrarySidebar />
            </div>
            <Workspace />
            <InspectorSidebar />
          </div>
        </div>
        <NarrowScreenNotice />
        <ShortcutsDialog />
        <AboutDialog />
        <ResetDialog />
      </Toaster>
    </TooltipProvider>
  );
}

/** Below tablet width the editor isn't usable; say so instead of cramming it. */
function NarrowScreenNotice() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-8 text-center md:hidden">
      <div className="flex size-11 items-center justify-center rounded-xl bg-accent-soft text-accent">
        <Monitor className="size-5" />
      </div>
      <h2 className="text-[15px] font-semibold">Plinth needs a larger screen</h2>
      <p className="max-w-xs text-xs leading-5 text-muted">
        The mockup editor is designed for desktop and tablet. Open this page on a wider window to turn screenshots into
        polished device mockups.
      </p>
    </div>
  );
}

/**
 * Drives the dot-grid spotlight with CSS variables (no React re-renders),
 * throttled to one update per animation frame.
 */
function useSpotlight() {
  const shellRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const moveSpotlight = (event: React.PointerEvent) => {
    const shell = shellRef.current;
    if (!shell || event.pointerType === "touch") return;
    const { clientX, clientY } = event;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      const rect = shell.getBoundingClientRect();
      shell.style.setProperty("--spot-x", `${clientX - rect.left}px`);
      shell.style.setProperty("--spot-y", `${clientY - rect.top}px`);
      shell.style.setProperty("--spot-opacity", "1");
    });
  };
  const hideSpotlight = () => {
    cancelAnimationFrame(frame.current);
    shellRef.current?.style.setProperty("--spot-opacity", "0");
  };
  return { shellRef, moveSpotlight, hideSpotlight };
}
