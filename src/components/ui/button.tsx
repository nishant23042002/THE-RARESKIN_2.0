import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant =
  | "solid"
  | "solidLight"
  | "ghost"
  | "onLight"
  | "onDark"
  | "onCard";
type Size = "lg" | "md" | "sm";

const base =
  "inline-flex items-center justify-center gap-2.5 rounded-[2px] border text-[11px] uppercase tracking-[0.14em] " +
  "transition-[transform,background-color,border-color,color,opacity] duration-150 ease-[var(--ease-brand)] " +
  "active:scale-[0.985] disabled:pointer-events-none disabled:opacity-45";

const sizes: Record<Size, string> = {
  lg: "px-8 py-[18px] text-[12px] tracking-[0.16em]",
  md: "px-[26px] py-[15px]",
  sm: "px-[18px] py-3 text-[10px]",
};

const variants: Record<Variant, string> = {
  solid: "border-cta bg-cta text-w0 hover:bg-black",
  // solid white — a primary CTA sitting on a dark ground
  solidLight: "border-w0 bg-w0 text-cta hover:bg-white hover:border-white",
  // tint the fill on hover instead of swapping colours — never hides the label
  ghost:
    "border-current bg-transparent text-current opacity-80 hover:bg-current/10 hover:opacity-100",
  onLight:
    "border-white/60 bg-transparent text-white hover:border-white hover:bg-white hover:text-ink",
  onDark:
    "border-ink/40 bg-transparent text-ink hover:border-ink hover:bg-ink hover:text-w0",
  // primary CTA sitting on a per-fragrance card — solid in the fragrance's own
  // ink, inverts on hover. Both states are explicit (no currentColor swap that
  // would collapse fill and text to the same colour).
  onCard:
    "border-[var(--txt)] bg-[var(--txt)] text-[var(--txt-inv)] hover:bg-[var(--txt-inv)] hover:text-[var(--txt)]",
};

type StyleProps = { variant?: Variant; size?: Size; className?: string; children: ReactNode };

type ButtonProps = StyleProps &
  Omit<ComponentPropsWithoutRef<"button">, "className" | "children"> & { href?: never };

type LinkProps = StyleProps &
  Omit<ComponentPropsWithoutRef<typeof Link>, "className" | "children"> & { href: string };

export function Button({
  variant = "solid",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps | LinkProps) {
  const classes = cn(base, sizes[size], variants[variant], className);

  if (typeof (rest as { href?: unknown }).href === "string") {
    return (
      <Link className={classes} {...(rest as ComponentPropsWithoutRef<typeof Link>)}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...(rest as ComponentPropsWithoutRef<"button">)}>
      {children}
    </button>
  );
}
