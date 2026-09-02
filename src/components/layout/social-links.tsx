import type { ReactNode } from "react";

import { cn } from "@/lib/cn";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";

type Social = SiteSettingsInput["social"];

/**
 * Official-mark social icons for the footer + holding page. Every network is
 * always shown in full brand colour; the ones with a link set in
 * Site Settings → Social are live, the rest sit quietly dimmed until a URL is
 * added. `idp` keeps the Instagram gradient id unique when two rows render on
 * one page.
 */

const IG_STOPS = (
  <>
    <stop offset="0" stopColor="#F9CE34" />
    <stop offset="0.45" stopColor="#EE2A7B" />
    <stop offset="1" stopColor="#6228D7" />
  </>
);

function icons(idp: string): Record<keyof Social, ReactNode> {
  const igId = `${idp}-ig`;
  return {
    instagram: (
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <defs>
          <linearGradient id={igId} x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
            {IG_STOPS}
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="20" height="20" rx="5.6" fill={`url(#${igId})`} />
        <circle cx="12" cy="12" r="4.6" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="17.4" cy="6.6" r="1.4" fill="#fff" />
      </svg>
    ),
    facebook: (
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path
          fill="#1877F2"
          d="M24 12a12 12 0 1 0-13.875 11.854v-8.385H7.078V12h3.047V9.356c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.49 0-1.955.925-1.955 1.874V12h3.328l-.532 3.469h-2.796v8.385A12.002 12.002 0 0 0 24 12Z"
        />
      </svg>
    ),
    youtube: (
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path
          fill="#FF0000"
          d="M23.5 6.5a3 3 0 0 0-2.1-2.1C19.5 3.9 12 3.9 12 3.9s-7.5 0-9.4.5A3 3 0 0 0 .5 6.5 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.5 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.5Z"
        />
        <path fill="#fff" d="M9.6 15.5V8.5l6.2 3.5-6.2 3.5Z" />
      </svg>
    ),
    x: (
      <svg viewBox="0 0 24 24" className="size-[16px]" aria-hidden>
        <path
          fill="#0F0F0F"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z"
        />
      </svg>
    ),
    linkedin: (
      <svg viewBox="0 0 24 24" className="size-[18px]" aria-hidden>
        <path
          fill="#0A66C2"
          d="M22.22 0H1.77C.79 0 0 .77 0 1.72v20.55C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.72C24 .77 23.2 0 22.22 0ZM7.12 20.45H3.56V9h3.56v11.45ZM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13Zm15.11 13.02h-3.56v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29Z"
        />
      </svg>
    ),
  };
}

const ORDER: { key: keyof Social; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
];

export function SocialLinks({
  social,
  className,
  idp = "sl",
}: {
  social: Social;
  className?: string;
  idp?: string;
}) {
  const glyphs = icons(idp);

  return (
    <ul className={cn("flex flex-wrap items-center gap-2.5", className)}>
      {ORDER.map((o) => {
        const href = social[o.key];
        const tile =
          "grid size-9 place-items-center rounded-full bg-surface ring-1 ring-line-2";

        return (
          <li key={o.key}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={o.label}
                className={cn(
                  tile,
                  "group/soc transition duration-200 hover:-translate-y-0.5 hover:ring-ink/25 hover:shadow-[0_8px_20px_-10px_rgba(0,0,0,0.35)]",
                )}
              >
                {glyphs[o.key]}
              </a>
            ) : (
              <span
                aria-hidden
                className={cn(tile, "opacity-45")}
              >
                {glyphs[o.key]}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
