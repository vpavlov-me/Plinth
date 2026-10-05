/**
 * Classes for a Base UI <Collapsible.Panel> that animates its height
 * (Base UI exposes the measured height as --collapsible-panel-height).
 * The negative margin + padding keeps focus rings and tile outlines from
 * being clipped by the overflow while animating.
 */
export const COLLAPSE_PANEL =
  "-mx-1.5 h-[var(--collapsible-panel-height)] overflow-hidden px-1.5 transition-[height,opacity] duration-200 ease-out data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0 motion-reduce:transition-none";

/** Small chevron placed right after a heading; points down when open. */
export const COLLAPSE_CHEVRON =
  "size-3 shrink-0 text-subtle transition-transform duration-200 ease-out -rotate-90 group-data-[panel-open]:rotate-0 motion-reduce:transition-none";

/** Collapsible heading text: identical everywhere (inspector, library, folders). */
export const COLLAPSE_TRIGGER =
  "group flex h-7 cursor-default items-center gap-1.5 rounded-md text-left text-xs font-semibold text-ink transition-colors hover:text-ink/75";
