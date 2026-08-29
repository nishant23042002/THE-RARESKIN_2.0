"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { SessionUser } from "@/lib/auth";

type Status = "loading" | "authed" | "guest";

interface AuthValue {
  user: SessionUser | null;
  status: Status;
  /** re-fetch the session (call after a sign-in completes) */
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** sign-in modal state — the modal itself is mounted from the layout */
  signIn: { open: boolean; next: string };
  /** open the sign-in modal; `next` is where to land after a successful sign-in */
  openSignIn: (next?: string) => void;
  closeSignIn: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

const CACHE_KEY = "rareskin:auth:v1";

function readCache(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

function writeCache(user: SessionUser | null) {
  try {
    if (user) window.sessionStorage.setItem(CACHE_KEY, JSON.stringify(user));
    else window.sessionStorage.removeItem(CACHE_KEY);
  } catch {
    /* private mode — non-fatal */
  }
}

async function fetchSession(): Promise<SessionUser | null> {
  const res = await fetch("/api/auth/session", {
    headers: { accept: "application/json" },
    cache: "no-store",
  });
  const data = (await res.json()) as { user: SessionUser | null };
  return data.user;
}

/**
 * Client-side auth state. The storefront stays fully static: this provider
 * hydrates the session from `/api/auth/session` on mount (with a `sessionStorage`
 * cache so repeat loads don't flash), never from a server prop.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ user: SessionUser | null; status: Status }>(
    () => {
      const cached = readCache();
      return { user: cached, status: cached ? "authed" : "loading" };
    },
  );
  const [signIn, setSignIn] = useState<{ open: boolean; next: string }>({
    open: false,
    next: "/account",
  });

  const openSignIn = useCallback((next = "/account") => {
    setSignIn({ open: true, next: next.startsWith("/") ? next : "/account" });
  }, []);
  const closeSignIn = useCallback(
    () => setSignIn((s) => ({ ...s, open: false })),
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const user = await fetchSession();
      setState({ user, status: user ? "authed" : "guest" });
      writeCache(user);
    } catch {
      setState((s) => (s.status === "loading" ? { ...s, status: "guest" } : s));
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setState({ user: null, status: "guest" });
      writeCache(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const user = await fetchSession();
        if (cancelled) return;
        setState({ user, status: user ? "authed" : "guest" });
        writeCache(user);
      } catch {
        if (!cancelled) {
          setState((s) =>
            s.status === "loading" ? { ...s, status: "guest" } : s,
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Deep link: a guard bounced someone here as `/?signin=1&next=…`. Open the
  // modal and tidy the URL. Read from `location` directly so the storefront
  // doesn't opt into dynamic rendering via `useSearchParams`. Runs exactly once
  // (the ref survives Strict Mode's double-invoke; no cleanup, so the deferred
  // open always lands).
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("signin") === null) return;
    deepLinkHandled.current = true;

    const next = params.get("next") || "/account";
    params.delete("signin");
    params.delete("next");
    const qs = params.toString();
    window.history.replaceState(
      null,
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash,
    );
    // deferred out of the effect body (lint); `setTimeout` fires even when the
    // tab is backgrounded, unlike `requestAnimationFrame`
    window.setTimeout(
      () =>
        setSignIn({
          open: true,
          next: next.startsWith("/") ? next : "/account",
        }),
      0,
    );
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user: state.user,
        status: state.status,
        refresh,
        signOut,
        signIn,
        openSignIn,
        closeSignIn,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
