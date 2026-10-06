"use client";

import { Fragment } from "react";
import { Dialog, Kbd } from "@/components/ui/dialog";
import { useUIStore } from "@/editor/ui-store";
import { modKey } from "@/lib/platform";

type Shortcut = { keys: string[]; action: string };

function groups(): { title: string; items: Shortcut[] }[] {
  const mod = modKey().replace("+", "");
  return [
    {
      title: "General",
      items: [
        { keys: [mod, "O"], action: "Open a screenshot" },
        { keys: [mod, "V"], action: "Paste a screenshot from the clipboard" },
        { keys: [mod, "E"], action: "Export the image" },
        { keys: [mod, "Z"], action: "Undo" },
        { keys: [mod, "⇧", "Z"], action: "Redo" },
        { keys: ["?"], action: "Show keyboard shortcuts" },
      ],
    },
    {
      title: "Canvas",
      items: [
        { keys: ["←", "↑", "→", "↓"], action: "Nudge the selected device by 1 px" },
        { keys: ["⇧", "Arrows"], action: "Nudge by 10 px" },
        { keys: ["Delete"], action: "Remove the selected device" },
        { keys: ["Double-click"], action: "Crop the screenshot: drag to pan, scroll to zoom" },
        { keys: ["Esc"], action: "Leave crop mode, then clear the selection" },
      ],
    },
    {
      title: "Sliders",
      items: [
        { keys: ["Double-click"], action: "Reset to the default value" },
        { keys: ["←", "→"], action: "Step the focused slider" },
      ],
    },
  ];
}

/** Legend of the keyboard shortcuts (toolbar button or "?"). */
export function ShortcutsDialog() {
  const open = useUIStore((s) => s.dialog === "shortcuts");
  const setDialog = useUIStore((s) => s.setDialog);

  return (
    <Dialog open={open} onOpenChange={(next) => setDialog(next ? "shortcuts" : null)} title="Keyboard shortcuts">
      <div className="flex flex-col gap-4">
        {groups().map((group) => (
          <section key={group.title} aria-label={group.title}>
            <h3 className="mb-1.5 text-2xs font-semibold tracking-wide text-subtle uppercase">{group.title}</h3>
            <dl className="flex flex-col">
              {group.items.map((item) => (
                <div
                  key={item.action}
                  className="flex items-center justify-between gap-4 border-b border-line py-1.5 last:border-b-0"
                >
                  <dt className="text-xs text-ink">{item.action}</dt>
                  <dd className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, index) => (
                      <Fragment key={index}>
                        <Kbd>{key}</Kbd>
                      </Fragment>
                    ))}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>
    </Dialog>
  );
}
