"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { resetScrollLock } from "@/lib/scroll-lock";

/**
 * The admin shares its `<body>` with the storefront (one root layout). If a
 * storefront overlay — the cart drawer, the sign-in modal, the route-transition
 * curtain — unmounted across the jump into `/admin` without releasing its
 * scroll lock, the admin inherits a frozen page. Clear any leftover lock on
 * entry and on every admin navigation.
 */
export function AdminScrollGuard() {
  const pathname = usePathname();
  useEffect(() => {
    resetScrollLock();
    document.body.classList.remove("is-locked", "route-locked");
    document.body.style.removeProperty("overflow");
    document.documentElement.style.removeProperty("overflow");
  }, [pathname]);
  return null;
}
