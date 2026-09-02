"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { shouldToast } from "@/lib/notifications";
import type { NotificationRow, NotificationSummary } from "@/server/admin";

import { NotificationList } from "./notification-list";
import { ToastStack, type ActiveToast } from "./notification-toast";

const POLL_MS = 20_000;
const SEEN_KEY = "rrs.notif.lastToast";

export function NotificationBell({
  initial,
}: {
  initial: NotificationSummary;
}) {
  const [unread, setUnread] = useState(initial.unread);
  const [latest, setLatest] = useState<NotificationRow[]>(initial.latest);
  const [open, setOpen] = useState(false);
  const [ringing, setRinging] = useState(false);
  const [toasts, setToasts] = useState<ActiveToast[]>([]);

  const prevUnread = useRef(initial.unread);
  const lastToastRef = useRef<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    try {
      lastToastRef.current = sessionStorage.getItem(SEEN_KEY);
    } catch {
      /* private mode */
    }
  }, []);

  // ── title badge — re-derives the base from the live title so it survives
  //    client navigation (which resets `document.title` to the new page). ──
  useEffect(() => {
    const strip = (t: string) => t.replace(/^\(\d+\)\s+/, "");
    // defer so Next's own metadata effect sets the page title first
    const id = setTimeout(() => {
      const base = strip(document.title);
      document.title = unread > 0 ? `(${unread}) ${base}` : base;
    }, 0);
    return () => {
      clearTimeout(id);
      document.title = strip(document.title);
    };
  }, [unread, pathname]);

  const rememberToast = useCallback((id: string) => {
    lastToastRef.current = id;
    try {
      sessionStorage.setItem(SEEN_KEY, id);
    } catch {
      /* ignore */
    }
  }, []);

  const applySummary = useCallback(
    (s: NotificationSummary) => {
      setLatest(s.latest);

      if (s.unread > prevUnread.current) {
        setRinging(true);
        setTimeout(() => setRinging(false), 800);

        // toast the newest unread, loud rows we haven't toasted yet
        const fresh: ActiveToast[] = [];
        for (const n of s.latest) {
          if (n.id === lastToastRef.current) break;
          if (!n.read && shouldToast(n.severity)) {
            fresh.push({ ...n, key: `${n.id}-${Date.now()}` });
          }
        }
        if (s.latest[0]) rememberToast(s.latest[0].id);
        if (fresh.length) {
          setToasts((t) => [...t, ...fresh.reverse()]);
        }
      }

      prevUnread.current = s.unread;
      setUnread(s.unread);
    },
    [rememberToast],
  );

  // ── poll (visible tab only) ──────────────────────────────────────────
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let aborter: AbortController | null = null;
    let stopped = false;

    async function tick() {
      if (document.visibilityState !== "visible") return schedule();
      aborter = new AbortController();
      try {
        const res = await fetch("/api/admin/notifications/summary", {
          signal: aborter.signal,
          cache: "no-store",
        });
        if (res.ok) {
          const json = (await res.json()) as NotificationSummary & {
            ok: boolean;
          };
          if (!stopped) applySummary(json);
        }
      } catch {
        /* offline / aborted — try again next tick */
      }
      schedule();
    }
    function schedule() {
      if (stopped) return;
      timer = setTimeout(tick, POLL_MS);
    }
    function onVisible() {
      if (document.visibilityState === "visible") {
        clearTimeout(timer);
        tick();
      }
    }

    function onExternalRead() {
      clearTimeout(timer);
      tick();
    }

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("rrs:notif-refresh", onExternalRead);
    return () => {
      stopped = true;
      clearTimeout(timer);
      aborter?.abort();
      window.removeEventListener("rrs:notif-refresh", onExternalRead);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [applySummary]);

  // ── outside click / escape closes the dropdown ───────────────────────
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function markRead(body: Record<string, unknown>) {
    try {
      const res = await fetch("/api/admin/notifications/read", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as { unread: number };
        prevUnread.current = json.unread;
        setUnread(json.unread);
        setLatest((rows) =>
          rows.map((r) =>
            body.all || (body.ids as string[])?.includes(r.id)
              ? { ...r, read: true }
              : r,
          ),
        );
      }
    } catch {
      /* ignore */
    }
  }

  function activate(n: NotificationRow) {
    setOpen(false);
    if (!n.read) void markRead({ ids: [n.id] });
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={
          unread > 0 ? `Notifications, ${unread} unread` : "Notifications"
        }
        className="relative inline-flex size-8 items-center justify-center rounded-[3px] border border-line-2 text-ink-2 transition-colors hover:border-ink hover:text-ink"
      >
        <Icon
          name="bell"
          className={cn("size-[15px]", ringing && "bell-ring")}
        />
        {unread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[15px] rounded-full bg-error px-1 text-center text-[9px] leading-[15px] font-semibold text-w0 tabular-nums">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-[340px] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-[4px] border border-line bg-surface shadow-[0_16px_40px_-16px_rgba(0,0,0,0.45)]">
          <div className="flex items-center justify-between border-b border-line px-3 py-2">
            <span className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
              Notifications
            </span>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => void markRead({ all: true })}
                className="text-[10px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[60vh] overflow-y-auto">
            <NotificationList
              rows={latest}
              mode="panel"
              onActivate={activate}
            />
          </div>
          <Link
            href="/admin/notifications"
            prefetch={false}
            onClick={() => setOpen(false)}
            className="block border-t border-line px-3 py-2 text-center text-[10.5px] font-medium tracking-[0.1em] text-ink-2 uppercase hover:text-ink"
          >
            All notifications →
          </Link>
        </div>
      )}

      <ToastStack
        toasts={toasts}
        onClose={(key) =>
          setToasts((t) => t.filter((x) => x.key !== key))
        }
        onActivate={(t) => {
          setToasts((prev) => prev.filter((x) => x.key !== t.key));
          activate(t);
        }}
      />
    </div>
  );
}
