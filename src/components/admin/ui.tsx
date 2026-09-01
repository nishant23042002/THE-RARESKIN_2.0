import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/icon";
import {
  ADMIN_STATUS_LABEL,
  ADMIN_STATUS_TONE,
  PAYMENT_STATUS_LABEL,
} from "@/lib/admin";
import type { OrderStatus } from "@/lib/validation/commerce";
import { cn } from "@/lib/cn";

/** Shared admin primitives — quiet, dense, built from the storefront tokens. */

export function PageHeader({
  eyebrow,
  title,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  actions?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-4">
      <div>
        {eyebrow && (
          <p className="text-[10px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            {eyebrow}
          </p>
        )}
        <h1 className="mt-1 text-[1.4rem] leading-tight tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {children && <div className="mt-1 text-[12.5px] text-ink-2">{children}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  className,
  children,
}: {
  title?: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("border border-line bg-surface", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          {title && (
            <h2 className="text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: IconName;
  tone?: "ok" | "warn";
}) {
  return (
    <div className="border border-line bg-surface p-4">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium tracking-[0.14em] text-ink-3 uppercase">
          {label}
        </span>
        {icon && <Icon name={icon} className="size-3.5 text-ink-3" />}
      </div>
      <div
        className={cn(
          "mt-2 text-[1.5rem] leading-none tabular-nums",
          tone === "ok" && "text-ok",
          tone === "warn" && "text-error",
          !tone && "text-ink",
        )}
      >
        {value}
      </div>
      {hint && <div className="mt-1.5 text-[11px] text-ink-3">{hint}</div>}
    </div>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: OrderStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium tracking-[0.09em] uppercase",
        ADMIN_STATUS_TONE[status],
        className,
      )}
    >
      {ADMIN_STATUS_LABEL[status]}
    </span>
  );
}

export function PaymentBadge({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? "border-ok/50 text-ok"
      : status === "failed"
        ? "border-error/40 text-error"
        : status.includes("refund")
          ? "border-line-2 text-ink-3"
          : "border-gilt/50 text-[#8f6118]";
  return (
    <span
      className={cn(
        "inline-block shrink-0 rounded-full border px-2 py-0.5 text-[9.5px] font-medium tracking-[0.09em] uppercase",
        tone,
      )}
    >
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function EmptyState({
  icon = "box",
  children,
}: {
  icon?: IconName;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      <Icon name={icon} className="size-6 text-ink-3" />
      <p className="text-[12.5px] text-ink-2">{children}</p>
    </div>
  );
}

/** A label / value row for the order-detail info panels. */
export function Detail({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex justify-between gap-4 py-1.5 text-[12.5px]">
      <span className="shrink-0 text-ink-3">{label}</span>
      <span className="text-right text-ink">{children}</span>
    </div>
  );
}
