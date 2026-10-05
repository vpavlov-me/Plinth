"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-ink hover:opacity-90",
  secondary: "border border-line bg-panel text-ink hover:bg-hover",
  ghost: "text-ink hover:bg-hover",
};

const SIZES: Record<Size, string> = {
  sm: "h-7 gap-1.5 px-2.5 text-xs",
  md: "h-8 gap-2 px-3 text-[13px]",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "secondary", size = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 cursor-default items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  );
});

type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  label: string;
  shortcut?: string;
  icon: ReactNode;
  active?: boolean;
  tooltipSide?: "top" | "bottom" | "left" | "right";
};

/** Icon-only button. Always labelled and always has a tooltip. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, shortcut, icon, active, className, tooltipSide, type = "button", ...props },
  ref,
) {
  return (
    <Tooltip label={label} shortcut={shortcut} side={tooltipSide}>
      <button
        ref={ref}
        type={type}
        aria-label={label}
        aria-pressed={active}
        className={cn(
          "inline-flex size-8 shrink-0 cursor-default items-center justify-center rounded-lg text-muted transition-colors hover:bg-hover hover:text-ink disabled:pointer-events-none disabled:opacity-35 [&_svg]:size-4",
          active && "bg-active text-ink",
          className,
        )}
        {...props}
      >
        {icon}
      </button>
    </Tooltip>
  );
});
