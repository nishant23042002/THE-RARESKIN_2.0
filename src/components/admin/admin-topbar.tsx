"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { ROLE_LABEL, type AdminTheme } from "@/lib/admin";
import { AdminThemeToggle } from "./admin-theme-toggle";

/**
 * Admin top bar — who's signed in, the live sudo window, the theme toggle, a
 * way back to the store, and sign-out.
 *
 * Responsive: it `flex-wrap`s (never a fixed `h-14`), so on a narrow screen the
 * action group drops to a second row instead of overlapping. Below `sm` the
 * "Account" / "View store" links are icon-only.
 */
export function AdminTopbar({
  name,
  role,
  sudoUntil,
  theme,
}: {
  name: string;
  role: string;
  sudoUntil: string | null;
  theme: AdminTheme;
}) {
  const router = useRouter();
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!sudoUntil) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sudoUntil]);

  const remaining = sudoUntil
    ? Math.max(0, new Date(sudoUntil).getTime() - now)
    : 0;

  async function signOut() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  const mm = Math.floor(remaining / 60000);
  const ss = Math.floor((remaining % 60000) / 1000);

  return (
    <header className="flex min-h-14 flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-line bg-surface px-4 py-2 sm:gap-x-4 sm:px-5">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <span className="truncate text-[13px] text-ink">{name || "Staff"}</span>
        <span className="shrink-0 rounded-full border border-line-2 px-2 py-0.5 text-[9px] font-medium tracking-[0.1em] text-ink-3 uppercase sm:text-[9.5px]">
          {ROLE_LABEL[role] ?? role}
        </span>
        {remaining > 0 && (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ok/40 px-2 py-0.5 text-[9px] font-medium tracking-[0.08em] text-ok uppercase tabular-nums sm:text-[9.5px]">
            <Icon name="lock" className="size-[11px]" />
            {mm}:{String(ss).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
        <AdminThemeToggle initial={theme} />
        <Link
          href="/admin/account"
          aria-label="Account & security"
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase transition-colors hover:border-ink hover:text-ink sm:border-0 sm:px-0.5 sm:py-0"
        >
          <Icon name="lock" className="size-3.5 sm:size-3" />
          <span className="hidden sm:inline">Account</span>
        </Link>
        <Link
          href="/"
          aria-label="View store"
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase transition-colors hover:border-ink hover:text-ink sm:border-0 sm:px-0.5 sm:py-0"
        >
          <span className="hidden sm:inline">View store</span>
          <Icon name="external" className="size-3.5 sm:size-3" />
        </Link>
        <button
          onClick={signOut}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase transition-colors hover:border-ink hover:text-ink disabled:opacity-50"
        >
          <Icon name="logout" className="size-[13px]" />
          {busy ? "…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
