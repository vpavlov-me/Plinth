import type { ReactNode } from "react";

type Props = { title: string; action?: ReactNode; children: ReactNode };

/** Inspector section: a small heading and its controls. */
export function Section({ title, action, children }: Props) {
  return (
    <section className="border-b border-line px-4 py-3.5 last:border-b-0" aria-label={title}>
      <header className="mb-2.5 flex h-6 items-center justify-between">
        <h2 className="text-xs font-semibold text-ink">{title}</h2>
        {action}
      </header>
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function FieldRow({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="grid grid-cols-[64px_1fr] items-center gap-2">
      <label htmlFor={htmlFor} className="text-xs text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}
