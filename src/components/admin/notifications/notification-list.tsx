"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import {
  NOTIFICATION_META,
  SEVERITY_TONE,
  relativeTime,
} from "@/lib/notifications";
import type { NotificationRow } from "@/server/admin";

/** Re-render every 30 s so `relativeTime` ticks. */
function useTick(ms = 30_000) {
  const [, setN] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setN((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
}

export function NotificationRowItem({
  n,
  onActivate,
  compact = false,
}: {
  n: NotificationRow;
  onActivate?: (n: NotificationRow) => void;
  compact?: boolean;
}) {
  const meta = NOTIFICATION_META[n.category];
  const tone = SEVERITY_TONE[n.severity];

  const inner = (
    <>
      <span className="relative flex shrink-0 flex-col items-center pt-1">
        <span className={cn("size-1.5 rounded-full", tone.dot)} />
      </span>
      <Icon
        name={meta.icon}
        className={cn("mt-0.5 size-3.5 shrink-0", tone.text)}
      />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "truncate text-[12.5px]",
              n.read ? "text-ink-2" : "font-medium text-ink",
            )}
          >
            {n.title}
          </span>
          <span className="shrink-0 text-[10px] text-ink-3 tabular-nums">
            {relativeTime(n.createdAt)}
          </span>
        </span>
        {n.body && (
          <span
            className={cn(
              "mt-0.5 block text-[11.5px] leading-snug",
              compact ? "truncate" : "line-clamp-2",
              "text-ink-3",
            )}
          >
            {n.body}
          </span>
        )}
      </span>
    </>
  );

  const cls = cn(
    "flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors",
    !n.read && "bg-surface-2/40",
    n.href ? "hover:bg-surface-2/70" : "cursor-default",
  );

  if (n.href) {
    return (
      <Link
        href={n.href}
        prefetch={false}
        onClick={() => onActivate?.(n)}
        className={cls}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => onActivate?.(n)} className={cls}>
      {inner}
    </button>
  );
}

export function NotificationList({
  rows,
  onActivate,
  mode = "page",
}: {
  rows: NotificationRow[];
  onActivate?: (n: NotificationRow) => void;
  mode?: "panel" | "page";
}) {
  useTick();

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <Icon name="bell" className="size-6 text-ink-3" />
        <p className="text-[12.5px] text-ink-2">
          Nothing here yet. New activity from the storefront lands here.
        </p>
      </div>
    );
  }

  if (mode === "panel") {
    const unread = rows.filter((r) => !r.read);
    const read = rows.filter((r) => r.read);
    return (
      <div className="divide-y divide-line">
        {unread.length > 0 && (
          <div>
            <p className="px-3 pt-2.5 pb-1 text-[9.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
              New
            </p>
            {unread.map((n) => (
              <NotificationRowItem
                key={n.id}
                n={n}
                onActivate={onActivate}
                compact
              />
            ))}
          </div>
        )}
        {read.length > 0 && (
          <div>
            {unread.length > 0 && (
              <p className="px-3 pt-2.5 pb-1 text-[9.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                Earlier
              </p>
            )}
            {read.map((n) => (
              <NotificationRowItem
                key={n.id}
                n={n}
                onActivate={onActivate}
                compact
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="divide-y divide-line">
      {rows.map((n) => (
        <NotificationRowItem key={n.id} n={n} onActivate={onActivate} />
      ))}
    </div>
  );
}
