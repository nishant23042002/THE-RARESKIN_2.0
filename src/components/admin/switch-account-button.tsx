"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * "Use a different account" — signs the current account out, then reopens the
 * sign-in modal pointed back at `/admin`. Shown on the admin no-access screen
 * when the signed-in account isn't the one the person meant to use.
 */
export function SwitchAccountButton({ className }: { className?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function switchAccount() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // best effort — still send them to the sign-in prompt
    }
    router.replace("/?signin=1&next=/admin");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={switchAccount}
      disabled={busy}
      className={
        className ??
        "inline-flex items-center justify-center gap-2.5 rounded-[2px] border border-ink/40 bg-transparent px-[18px] py-3 text-[10px] tracking-[0.14em] text-ink uppercase transition-colors duration-150 hover:border-ink hover:bg-ink hover:text-w0 disabled:pointer-events-none disabled:opacity-45"
      }
    >
      {busy ? "Signing out…" : "Use a different account"}
    </button>
  );
}
