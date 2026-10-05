"use client";

import { useRef } from "react";
import { Monitor } from "lucide-react";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { InspectorSidebar } from "@/components/editor/sidebars/inspector-sidebar";
import { LibrarySidebar } from "@/components/editor/sidebars/library-sidebar";
import { useEditorShortcuts } from "@/components/editor/use-editor-shortcuts";
import { usePersistence } from "@/components/editor/use-persistence";
import { Workspace } from "@/components/editor/workspace";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useUIStore } from "@/editor/ui-store";
import { cn } from "@/lib/cn";

export function EditorShell() {
  usePersistence();
  useEditorShortcuts();
  const panels = useUIStore((s) => s.panels);
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
            <SlidingPanel open={panels.library} width={248} side="left" className="hidden xl:block">
              <LibrarySidebar />
            </SlidingPanel>
            <Workspace />
            <SlidingPanel open={panels.inspector} width={300} side="right">
              <InspectorSidebar />
            </SlidingPanel>
          </div>
        </div>
        <NarrowScreenNotice />
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
 * Animates a floating panel in and out by collapsing its width (and the
 * adjacent gap). The workspace re-fits the canvas continuously meanwhile.
 */
function SlidingPanel({
  open,
  width,
  side,
  className,
  children,
}: {
  open: boolean;
  width: number;
  side: "left" | "right";
  className?: string;
  children: React.ReactNode;
}) {
  const gap = 12;
  return (
    <div
      inert={!open}
      className={cn(
        "shrink-0 transition-[width,margin,opacity,visibility] duration-300 ease-out motion-reduce:transition-none",
        !open && "invisible opacity-0",
        className,
      )}
      style={{
        width: open ? width : 0,
        [side === "left" ? "marginRight" : "marginLeft"]: open ? 0 : -gap,
        // Clip the sliding content but let the panel's soft shadow show.
        overflow: "clip",
        overflowClipMargin: 32,
      }}
    >
      <div className={cn("h-full", side === "right" && "flex justify-end")} style={{ width }}>
        {children}
      </div>
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
