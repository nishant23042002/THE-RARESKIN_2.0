import type { ReactElement } from "react";

import { cn } from "@/lib/cn";

/**
 * The house icon set — one hairline weight, round ends, a 24-grid, drawn to sit
 * beside THE RARESKIN's uppercase labels without shouting. Every icon inherits
 * `currentColor` and scales to `1em` by default, so it tracks the text it
 * annotates; pass a `size-*` class to pin it.
 *
 *   <Icon name="bag" />
 *   <Icon name="user" className="size-4" />
 *   <Icon name="download" title="Download invoice" />   // labelled → role="img"
 *
 * Add an icon by adding one entry to `PATHS`. Keep it inside the 24-box with a
 * ~2px optical margin and let the shared <svg> supply stroke, caps and joins.
 */

export type IconName =
  | "bag"
  | "user"
  | "signin"
  | "logout"
  | "close"
  | "lock"
  | "plus"
  | "minus"
  | "check"
  | "chevron"
  | "arrowRight"
  | "arrowUpRight"
  | "download"
  | "truck"
  | "shield"
  | "returns"
  | "receipt"
  | "banknote"
  | "mail"
  | "phone"
  | "pin";

const PATHS: Record<IconName, ReactElement> = {
  bag: (
    <>
      <path d="M5.5 8h13l-1 11.4A2.5 2.5 0 0 1 15 21.7H9A2.5 2.5 0 0 1 6.5 19.4L5.5 8Z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8.25" r="3.25" />
      <path d="M5.75 19.5a6.25 6.25 0 0 1 12.5 0" />
    </>
  ),
  signin: (
    <>
      <path d="M13 4h4.5A1.5 1.5 0 0 1 19 5.5v13a1.5 1.5 0 0 1-1.5 1.5H13" />
      <path d="M4 12h10.5M10.5 8l4 4-4 4" />
    </>
  ),
  logout: (
    <>
      <path d="M11 4H6.5A1.5 1.5 0 0 0 5 5.5v13A1.5 1.5 0 0 0 6.5 20H11" />
      <path d="M20 12H9.5M16 8l4 4-4 4" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="1.75" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="M5 12.5l4.5 4.5L19 7" />,
  chevron: <path d="M9 5l7 7-7 7" />,
  arrowRight: <path d="M4 12h16M14 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8 7h9v9" />,
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14" />,
  truck: (
    <>
      <path d="M3 7h11v10H3z" />
      <path d="M14 10h3.6L21 13.2V17h-7z" />
      <circle cx="7" cy="18.5" r="1.6" />
      <circle cx="17.2" cy="18.5" r="1.6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3.5l7 2.6v4.9c0 4.7-3.1 7.9-7 9.5-3.9-1.6-7-4.8-7-9.5V6.1z" />
      <path d="M8.75 12l2.25 2.25L15.5 9.5" />
    </>
  ),
  returns: (
    <>
      <path d="M8 5L4 9l4 4" />
      <path d="M4 9h9.5a6 6 0 0 1 0 12H8" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3.5h12v17l-2-1.4-2 1.4-2-1.4-2 1.4-2-1.4-2 1.4z" />
      <path d="M9 9h6M9 12.5h6M9 16h4" />
    </>
  ),
  banknote: (
    <>
      <rect x="3" y="7" width="18" height="10" rx="1.5" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M6.5 9.5v5M17.5 9.5v5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  phone: (
    <path d="M6.5 4h3l1.4 4.2-2 1.3a10.5 10.5 0 0 0 4.9 4.9l1.3-2 4.2 1.4v3a1.8 1.8 0 0 1-1.9 1.8A15.5 15.5 0 0 1 4.7 5.9 1.8 1.8 0 0 1 6.5 4Z" />
  ),
  pin: (
    <>
      <path d="M12 20.5c3.8-3.6 6-6.7 6-9.8a6 6 0 0 0-12 0c0 3.1 2.2 6.2 6 9.8Z" />
      <circle cx="12" cy="10.5" r="2.25" />
    </>
  ),
};

export interface IconProps {
  name: IconName;
  className?: string;
  /** stroke weight on the 24-grid (default 1.5) */
  strokeWidth?: number;
  /** a label — turns the icon into `role="img"` for standalone use */
  title?: string;
}

export function Icon({ name, className, strokeWidth = 1.5, title }: IconProps) {
  return (
    <svg
      // `1em` is the fallback; any `size-*` / `w-*` class overrides it cleanly
      // because a CSS class beats a presentation attribute.
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("inline-block shrink-0", className)}
    >
      {PATHS[name]}
    </svg>
  );
}
