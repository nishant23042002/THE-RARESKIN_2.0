"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { NOTIFICATION_META, SEVERITY_TONE } from "@/lib/notifications";
import type { NotificationRow } from "@/server/admin";

export interface ActiveToast extends NotificationRow {
  /** local instance id so re-toasting the same notification still animates */
  key: string;
}

function Toast({
  toast,
  onClose,
  onActivate,
}: {
  toast: ActiveToast;
  onClose: () => void;
  onActivate: () => void;
}) {
  const meta = NOTIFICATION_META[toast.category];
  const tone = SEVERITY_TONE[toast.severity];

  useEffect(() => {
    // critical stays until dismissed; attention auto-clears
    if (toast.severity === "critical") return;
    const id = setTimeout(onClose, 7000);
    return () => clearTimeout(id);
  }, [toast.severity, onClose]);

  return (
    <div
      role="status"
      className="toast-in ui-surface pointer-events-auto flex w-[320px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[4px] border border-line bg-surface shadow-[0_12px_32px_-12px_rgba(0,0,0,0.4)]"
    >
      <span className={cn("w-[3px] shrink-0", tone.stripe)} />
      <div className="flex min-w-0 flex-1 gap-2.5 p-3">
        <Icon name={meta.icon} className={cn("mt-0.5 size-4 shrink-0", tone.text)} />
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-ink">{toast.title}</p>
          {toast.body && (
            <p className="mt-0.5 line-clamp-2 text-[11.5px] leading-snug text-ink-3">
              {toast.body}
            </p>
          )}
          {toast.href && (
            <Link
              href={toast.href}
              prefetch={false}
              onClick={onActivate}
              className="mt-1.5 inline-block text-[10.5px] font-medium tracking-[0.1em] text-ink-2 uppercase underline-offset-2 hover:text-ink hover:underline"
            >
              View
            </Link>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Dismiss"
          className="-mt-1 -mr-1 size-6 shrink-0 text-ink-3 hover:text-ink"
        >
          <Icon name="close" className="mx-auto size-3.5" />
        </button>
      </div>
    </div>
  );
}

export function ToastStack({
  toasts,
  onClose,
  onActivate,
}: {
  toasts: ActiveToast[];
  onClose: (key: string) => void;
  onActivate: (t: ActiveToast) => void;
}) {
  if (toasts.length === 0) return null;
  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex flex-col-reverse gap-2">
      {toasts.slice(-4).map((t) => (
        <Toast
          key={t.key}
          toast={t}
          onClose={() => onClose(t.key)}
          onActivate={() => onActivate(t)}
        />
      ))}
    </div>
  );
}
