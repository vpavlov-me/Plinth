"use client";

import { ArrowUpRight, Globe } from "lucide-react";
import { SITE } from "@/app/site";
import { Dialog } from "@/components/ui/dialog";
import { useUIStore } from "@/editor/ui-store";

const HIGHLIGHTS = [
  "25 device frames, multi-device layouts and perspective presets",
  "Gradients, photos and backgrounds matched to your screenshot's colours",
  "Social and app store canvas sizes, PNG or JPG export up to 3×",
  "Runs entirely in your browser: no sign-up, nothing is uploaded",
];

/** What Plinth is and who made it. */
export function AboutDialog() {
  const open = useUIStore((s) => s.dialog === "about");
  const setDialog = useUIStore((s) => s.setDialog);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => setDialog(next ? "about" : null)}
      title={`About ${SITE.name}`}
      description={SITE.shortDescription}
    >
      <p className="text-xs leading-5 text-muted">
        Drop a screenshot, place it in a phone, tablet, laptop or browser frame, style the scene and export a polished
        image for your website, App Store page or social post. Free, with no watermarks.
      </p>
      <ul className="mt-3 flex flex-col gap-1.5">
        {HIGHLIGHTS.map((item) => (
          <li key={item} className="flex gap-2 text-xs leading-5 text-ink">
            <span className="mt-[7px] size-1.5 shrink-0 rounded-full bg-accent" aria-hidden />
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-5 border-t border-line pt-4">
        <p className="text-xs text-muted">
          Made by <span className="font-medium text-ink">{SITE.author.name}</span>
        </p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          <AuthorLink href={SITE.author.url} icon={<Globe />} label={new URL(SITE.author.url).host} />
          <AuthorLink href={SITE.author.github} icon={<GitHubMark />} label="GitHub" />
        </div>
      </div>
    </Dialog>
  );
}

function AuthorLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-line px-3 text-xs font-medium text-ink transition-colors hover:bg-hover [&_svg]:size-3.5"
    >
      {icon}
      {label}
      <ArrowUpRight className="text-subtle" />
    </a>
  );
}

function GitHubMark() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
