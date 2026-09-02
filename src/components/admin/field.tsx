"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import { InfoTip } from "./info-tip";

/**
 * Admin form primitives — a label + control + error text, on the `.ui-surface`
 * weight. Kept deliberately plain; the admin is a tool, not a landing page.
 */

const inputCls =
  "w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink outline-none transition-colors focus:border-ink placeholder:text-ink-3 disabled:opacity-50";

export function Field({
  label,
  hint,
  error,
  htmlFor,
  info,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  htmlFor?: string;
  /** a short "what is this / where does it go" note behind a `?` on hover */
  info?: ReactNode;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
          {label}
          {info && <InfoTip>{info}</InfoTip>}
        </span>
        {hint && <span className="shrink-0 text-[10px] text-ink-3">{hint}</span>}
      </span>
      <span className="mt-1 block">{children}</span>
      {error && <span className="mt-1 block text-[11px] text-error">{error}</span>}
    </label>
  );
}

export function TextInput({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(inputCls, className)} />;
}

export function TextArea({
  className,
  rows = 3,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      rows={rows}
      className={cn(inputCls, "resize-y leading-relaxed", className)}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...props} className={cn(inputCls, className)}>
      {children}
    </select>
  );
}

/**
 * A switch, not a tickbox — reads as "on / off" at a glance. Keeps the checkbox
 * API (`checked` + `onChange` with `e.target.checked`) so it drops in wherever
 * `Checkbox` was. Pass `stateText` to print ON / OFF next to the track.
 */
export function Toggle({
  label,
  stateText = false,
  className,
  ...props
}: {
  label?: ReactNode;
  stateText?: boolean;
  className?: string;
} & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label
      className={cn(
        "group/toggle inline-flex items-center gap-2.5 text-[12.5px] text-ink",
        props.disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
        className,
      )}
    >
      <input type="checkbox" role="switch" {...props} className="sr-only" />
      <span
        aria-hidden
        className="relative inline-flex h-[18px] w-8 shrink-0 items-center rounded-full bg-line-2 transition-colors duration-200 group-has-[:checked]/toggle:bg-cta group-has-[:focus-visible]/toggle:ring-2 group-has-[:focus-visible]/toggle:ring-ink/35"
      >
        <span className="absolute left-[3px] size-3 rounded-full bg-surface shadow-sm transition-transform duration-200 ease-out group-has-[:checked]/toggle:translate-x-[14px]" />
      </span>
      {stateText && (
        <span className="w-7 shrink-0 text-[9.5px] font-semibold tracking-[0.12em] text-ink-3 uppercase group-has-[:checked]/toggle:text-ink">
          <span className="group-has-[:checked]/toggle:hidden">Off</span>
          <span className="hidden group-has-[:checked]/toggle:inline">On</span>
        </span>
      )}
      {label != null && <span>{label}</span>}
    </label>
  );
}

/** @deprecated use {@link Toggle} — same component, clearer name. */
export const Checkbox = Toggle;

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-t border-line py-5 first:border-t-0 first:pt-0">
      <h3 className="text-[11px] font-medium tracking-[0.14em] text-ink-3 uppercase">
        {title}
      </h3>
      {description && (
        <p className="mt-0.5 text-[11.5px] text-ink-3">{description}</p>
      )}
      <div className="mt-3 grid gap-3">{children}</div>
    </section>
  );
}

export function Row({ children }: { children: ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
