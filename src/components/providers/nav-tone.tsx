"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

/**
 * The tone the header should paint itself when it is transparent (sitting over
 * the hero). "dark" = ink text/marks (over a light ground), "light" = cream
 * text (over a dark ground). The hero carousel sets this per active slide;
 * once the header is scrolled it ignores this and goes frosted + ink.
 *
 * Default "dark" so every non-hero page just works.
 */
export type NavTone = "dark" | "light";

interface NavToneContextValue {
  tone: NavTone;
  setTone: (tone: NavTone) => void;
}

const NavToneContext = createContext<NavToneContextValue | null>(null);

export function NavToneProvider({ children }: { children: ReactNode }) {
  const [tone, setTone] = useState<NavTone>("dark");
  const value = useMemo(() => ({ tone, setTone }), [tone]);
  return (
    <NavToneContext.Provider value={value}>{children}</NavToneContext.Provider>
  );
}

export function useNavTone(): NavToneContextValue {
  const ctx = useContext(NavToneContext);
  if (!ctx) throw new Error("useNavTone must be used within <NavToneProvider>");
  return ctx;
}
