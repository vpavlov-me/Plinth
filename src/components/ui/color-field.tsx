"use client";

import { useState } from "react";

type Props = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
};

const HEX = /^#?([0-9a-f]{6}|[0-9a-f]{3})$/i;

function normalizeHex(input: string): string | null {
  const match = HEX.exec(input.trim());
  if (!match) return null;
  let hex = match[1]!.toLowerCase();
  if (hex.length === 3)
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  return `#${hex}`;
}

/** Colour swatch (opens the native picker) plus an editable hex value. */
export function ColorField({ label, value, onChange, onCommit }: Props) {
  const [draft, setDraft] = useState(value);
  // Reset the draft when the value changes from outside (derived state).
  const [synced, setSynced] = useState(value);
  if (synced !== value) {
    setSynced(value);
    setDraft(value);
  }

  const commitDraft = () => {
    const hex = normalizeHex(draft);
    if (hex && hex !== value) {
      onChange(hex);
      onCommit();
    } else {
      setDraft(value);
    }
  };

  return (
    <div className="flex h-8 min-w-0 items-center gap-2 rounded-lg bg-field pr-2 pl-1 focus-within:outline-2 focus-within:outline-accent">
      <label
        className="relative size-6 shrink-0 overflow-hidden rounded-md shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)]"
        style={{ background: value }}
      >
        <span className="sr-only">{label} picker</span>
        <input
          type="color"
          value={value.length === 7 ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
      </label>
      <input
        aria-label={label}
        value={draft}
        spellCheck={false}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commitDraft}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
          if (e.key === "Escape") {
            setDraft(value);
            e.currentTarget.blur();
          }
        }}
        className="w-full min-w-0 bg-transparent font-mono text-xs text-ink uppercase outline-none"
      />
    </div>
  );
}
