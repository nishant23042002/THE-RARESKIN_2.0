"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";
import { ROLE_LABEL } from "@/lib/admin";

/**
 * Admin top bar — who's signed in, the live sudo window, a way back to the
 * store, and sign-out. `sudoUntil` is an ISO string (or null); the pill counts
 * it down and disappears when it lapses.
 */
export function AdminTopbar({
  name,
  role,
  sudoUntil,
}: {
  name: string;
  role: string;
  sudoUntil: string | null;
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
    <header className="flex h-14 items-center justify-between gap-4 border-b border-line bg-surface px-5">
      <div className="flex items-center gap-3">
        <span className="text-[13px] text-ink">{name || "Staff"}</span>
        <span className="rounded-full border border-line-2 px-2 py-0.5 text-[9.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
          {ROLE_LABEL[role] ?? role}
        </span>
        {remaining > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-ok/40 px-2 py-0.5 text-[9.5px] font-medium tracking-[0.08em] text-ok uppercase tabular-nums">
            <Icon name="lock" className="size-[11px]" />
            sudo {mm}:{String(ss).padStart(2, "0")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:text-ink"
        >
          View store
          <Icon name="external" className="size-3" />
        </Link>
        <button
          onClick={signOut}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-[3px] border border-line-2 px-2.5 py-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:border-ink hover:text-ink disabled:opacity-50"
        >
          <Icon name="logout" className="size-[13px]" />
          {busy ? "…" : "Sign out"}
        </button>
      </div>
    </header>
  );
}
