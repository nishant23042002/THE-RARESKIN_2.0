"use client";

import { useState } from "react";

import { Icon } from "@/components/ui/icon";
import { ADMIN_THEME_COOKIE, type AdminTheme } from "@/lib/admin";

/**
 * Light / dark toggle for Studio. The initial value is resolved server-side
 * from the `ADMIN_THEME_COOKIE` (so there's no flash); this just flips the
 * `data-admin-theme` attribute on the shell live and re-writes the cookie.
 * Scoped to the admin — the storefront keeps its single light theme.
 */
export function AdminThemeToggle({ initial }: { initial: AdminTheme }) {
  const [theme, setTheme] = useState<AdminTheme>(initial);

  function toggle() {
    const next: AdminTheme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.cookie = `${ADMIN_THEME_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const root =
      document.querySelector<HTMLElement>("[data-admin-theme]") ??
      document.documentElement;
    root.setAttribute("data-admin-theme", next);
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
