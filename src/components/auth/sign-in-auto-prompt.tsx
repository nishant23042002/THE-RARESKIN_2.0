"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import { useAuth } from "@/components/providers/auth-provider";

/**
 * A gentle, once-in-a-while nudge to sign in — fired only once the visitor has
 * shown they're engaged (scrolled past ~55 % of the page), with a time fallback
 * for short pages. Guests only, never on `/account`, never over an open drawer
 * or modal, and a 7-day cooldown so it can't nag. Any manual open of the modal
 * (or a `?signin` deep link) also arms the cooldown.
 */

const KEY = "rareskin:signin-nudge:v1";
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;
const ARM_DELAY_MS = 9_000; // never sooner than this after landing
const IDLE_FALLBACK_MS = 30_000; // fire anyway once this elapses
const SCROLL_TRIGGER = 0.55; // fraction of the page's scrollable height

function onCooldown(): boolean {
  try {
    return Date.now() - Number(localStorage.getItem(KEY) || 0) < COOLDOWN_MS;
  } catch {
    return false;
  }
}
function armCooldown(): void {
  try {
    localStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* private mode — non-fatal */
  }
}

export function SignInAutoPrompt() {
  const { status, openSignIn, signIn } = useAuth();
  const pathname = usePathname();
  const firedRef = useRef(false);

  // Any time the modal opens (manually, a deep link, or us), arm the cooldown.
  useEffect(() => {
    if (signIn.open) armCooldown();
  }, [signIn.open]);

  useEffect(() => {
    if (
      status !== "guest" ||
      firedRef.current ||
      pathname.startsWith("/account") ||
      onCooldown()
    ) {
      return;
    }

    const landedAt = Date.now();
    let retry: number | undefined;

    const fire = () => {
      if (firedRef.current || status !== "guest") return cleanup();
      if (Date.now() - landedAt < ARM_DELAY_MS) return;
      if (document.hidden) return;
      if (signIn.open) {
        firedRef.current = true; // reached sign-in another way
        return cleanup();
      }
      // an overlay is up (menu / bag / another modal) — wait it out
      if (document.querySelector("dialog[open]")) {
        window.clearTimeout(retry);
        retry = window.setTimeout(fire, 3500);
        return;
      }
      firedRef.current = true;
      armCooldown();
      cleanup();
      openSignIn("/account");
    };

    const onScroll = () => {
      const el = document.documentElement;
      const max = el.scrollHeight - el.clientHeight;
      if (max > 40 && el.scrollTop / max >= SCROLL_TRIGGER) fire();
    };

    function cleanup() {
      window.clearTimeout(idle);
      window.clearTimeout(retry);
      window.removeEventListener("scroll", onScroll);
    }

    const idle = window.setTimeout(fire, IDLE_FALLBACK_MS);
    window.addEventListener("scroll", onScroll, { passive: true });
    return cleanup;
  }, [status, pathname, openSignIn, signIn.open]);

  return null;
}
