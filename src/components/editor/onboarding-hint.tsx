"use client";

import { Check, X } from "lucide-react";
import { useEffect } from "react";
import { useOnboardingStore } from "@/editor/onboarding";
import { useScene } from "@/editor/store";
import { cn } from "@/lib/cn";

const STEPS = ["Add a screenshot", "Pick a device or layout", "Export"];

/** A three-step hint at the bottom of the workspace on the first visit. Easy to dismiss, never repeated. */
export function OnboardingHint() {
  const done = useOnboardingStore((s) => s.done);
  const load = useOnboardingStore((s) => s.load);
  const complete = useOnboardingStore((s) => s.complete);
  const hasScreenshot = useScene((scene) => scene.devices.some((d) => d.screenshotId !== null));

  useEffect(() => {
    if (done === null) load();
  }, [done, load]);

  if (done !== false) return null;
  const current = hasScreenshot ? 1 : 0;

  return (
    <aside
      aria-label="Getting started"
      className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-xl bg-panel py-1.5 pr-1.5 pl-3 text-xs shadow-popover transition-opacity duration-300 starting:opacity-0"
    >
      <ol className="flex items-center gap-3">
        {STEPS.map((step, index) => {
          const passed = index < current;
          return (
            <li
              key={step}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap",
                index === current ? "text-ink" : "text-muted",
              )}
            >
              <span
                className={cn(
                  "flex size-4 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums",
                  passed
                    ? "bg-accent text-accent-ink"
                    : index === current
                      ? "bg-ink text-chrome"
                      : "bg-field text-muted",
                )}
              >
                {passed ? <Check className="size-2.5" strokeWidth={3} /> : index + 1}
              </span>
              {step}
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        aria-label="Dismiss tips"
        onClick={complete}
        className="ml-2 flex size-6 cursor-default items-center justify-center rounded-md text-muted transition-colors hover:bg-hover hover:text-ink"
      >
        <X className="size-3.5" />
      </button>
    </aside>
  );
}
