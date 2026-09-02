"use client";

import { useEffect, useState } from "react";

import { Icon } from "@/components/ui/icon";
import {
  ADMIN_THEME_COOKIE,
  ADMIN_THEME_STORAGE,
  type AdminTheme,
} from "@/lib/admin";

/**
 * Light / dark toggle for Studio. Dark is the default; a choice is stored in
 * both a cookie (server-read → no flash) and `localStorage`. On the client we
 * reconcile once against `localStorage` so a preference set on one visit sticks
 * even if the cookie was cleared, and a stale pre-default `light` cookie with no
 * stored choice falls back to dark. Scoped to the admin — the storefront keeps
 * its single light theme.
 */

function readStored(): AdminTheme | null {
  try {
    const v = localStorage.getItem(ADMIN_THEME_STORAGE);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function persist(next: AdminTheme) {
  document.cookie = `${ADMIN_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem(ADMIN_THEME_STORAGE, next);
  } catch {
    /* private mode */
  }
  const root =
    document.querySelector<HTMLElement>("[data-admin-theme]") ??
    document.documentElement;
  root.setAttribute("data-admin-theme", next);
}

export function AdminThemeToggle({ initial }: { initial: AdminTheme }) {
  const [theme, setTheme] = useState<AdminTheme>(initial);

  // reconcile with localStorage once, during render (the "adjust state during
  // render" pattern — no effect setState). `readStored()` is client-only, so
  // this branch never runs on the server.
  const [reconciled, setReconciled] = useState(false);
  if (!reconciled && typeof window !== "undefined") {
    setReconciled(true);
    const want = readStored() ?? "dark";
    if (want !== theme) setTheme(want);
  }

  // keep the cookie / localStorage / DOM attribute in sync with `theme`
  useEffect(() => {
    persist(theme);
  }, [theme]);

  function toggle() {
    setTheme((t) => (t === "dark" ? "light" : "dark"));
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
      title={theme === "dark" ? "Light theme" : "Dark theme"}
      className="inline-flex size-8 items-center justify-center rounded-[3px] border border-line-2 text-ink-2 transition-colors hover:border-ink hover:text-ink"
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} className="size-[15px]" />
    </button>
  );
}
