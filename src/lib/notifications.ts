/**
 * Isomorphic notification presentation — no DB, safe on the client.
 */
import type { IconName } from "@/components/ui/icon";
import type {
  NotificationCategory,
  NotificationSeverity,
} from "@/lib/validation/notification";

export const NOTIFICATION_META: Record<
  NotificationCategory,
  { icon: IconName; label: string }
> = {
  orders: { icon: "receipt", label: "Orders" },
  payments: { icon: "banknote", label: "Payments" },
  reviews: { icon: "star", label: "Reviews" },
  customers: { icon: "users", label: "Customers" },
  inventory: { icon: "box", label: "Inventory" },
  system: { icon: "gear", label: "System" },
};

/** Tailwind classes per severity — a dot, the text tone, and a left stripe. */
export const SEVERITY_TONE: Record<
  NotificationSeverity,
  { dot: string; text: string; stripe: string }
> = {
  info: { dot: "bg-ink-3", text: "text-ink-2", stripe: "bg-line-2" },
  success: { dot: "bg-ok", text: "text-ok", stripe: "bg-ok" },
  attention: { dot: "bg-warn", text: "text-warn", stripe: "bg-warn" },
  critical: { dot: "bg-error", text: "text-error", stripe: "bg-error" },
};

/** Whether a severity is loud enough to raise a toast. */
export function shouldToast(severity: NotificationSeverity): boolean {
  return severity === "critical" || severity === "attention";
}

/** "just now" · "4m ago" · "3h ago" · "2d ago" · "12 Aug". Pure — callers
 *  re-render on a timer so it ticks. */
export function relativeTime(iso: string, now = Date.now()): string {
  const sec = Math.round((now - new Date(iso).getTime()) / 1000);
  if (sec < 45) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}
