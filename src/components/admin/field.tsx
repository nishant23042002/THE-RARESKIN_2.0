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

export function Checkbox({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="flex items-center gap-2 text-[12.5px] text-ink">
      <input
        type="checkbox"
        {...props}
        className="size-3.5 accent-ink"
      />
      {label}
    </label>
  );
}

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
