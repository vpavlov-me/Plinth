"use client";

import { Monitor } from "lucide-react";
import { EditorToolbar } from "@/components/editor/editor-toolbar";
import { InspectorSidebar } from "@/components/editor/sidebars/inspector-sidebar";
import { LibrarySidebar } from "@/components/editor/sidebars/library-sidebar";
import { useEditorShortcuts } from "@/components/editor/use-editor-shortcuts";
import { usePersistence } from "@/components/editor/use-persistence";
import { Workspace } from "@/components/editor/workspace";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

export function EditorShell() {
  usePersistence();
  useEditorShortcuts();

  return (
    <TooltipProvider delay={400}>
      <Toaster>
        <div className="hidden h-dvh flex-col md:flex">
          <EditorToolbar />
          <div className="flex min-h-0 flex-1">
            <LibrarySidebar />
            <Workspace />
            <InspectorSidebar />
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
      <h1 className="text-[15px] font-semibold">Plinth needs a larger screen</h1>
      <p className="max-w-xs text-xs leading-5 text-muted">
        The mockup editor is designed for desktop and tablet. Open this page on a wider window to turn screenshots into
        polished device mockups.
      </p>
    </div>
  );
}
