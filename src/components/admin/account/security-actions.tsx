"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Icon } from "@/components/ui/icon";

/** Admin account — sign out of every device (revokes all sessions, then home). */
export function SecurityActions() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function signOutEverywhere() {
    setBusy(true);
    try {
      await fetch("/api/auth/sessions/revoke-all", { method: "POST" });
    } finally {
      router.replace("/");
      router.refresh();
    }
  }

  return (
    <button
      type="button"
      onClick={signOutEverywhere}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-[2px] border border-line-2 px-3.5 py-2 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-error hover:text-error disabled:opacity-50"
    >
      <Icon name="logout" className="size-[13px]" />
      {busy ? "Working…" : "Sign out of all devices"}
    </button>
  );
}
