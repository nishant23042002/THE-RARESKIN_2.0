import { cn } from "@/lib/cn";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";

type Social = SiteSettingsInput["social"];

/**
 * Official-mark social icons for the footer + holding page. Every network shows
 * its full-colour brand mark; the ones with a link set in Site Settings →
 * Social are live, the rest sit quietly dimmed until a URL is added.
 *
 * Facebook / Instagram / X / LinkedIn are the vendored brand SVGs in
 * `/public/social/`. YouTube stays a first-party inline glyph.
 */

const NETWORKS: {
  key: keyof Social;
  label: string;
  src?: string;
  glyph?: React.ReactNode;
}[] = [
  { key: "instagram", label: "Instagram", src: "/social/instagram.svg" },
  { key: "facebook", label: "Facebook", src: "/social/facebook.svg" },
  {
    key: "youtube",
    label: "YouTube",
    glyph: (
      <svg viewBox="0 0 24 24" className="size-full" aria-hidden>
        <rect x="1" y="4.5" width="22" height="15" rx="4" fill="#FF0000" />
        <path fill="#fff" d="M9.8 15.3V8.7l6 3.3-6 3.3Z" />
      </svg>
    ),
  },
  { key: "x", label: "X", src: "/social/x.svg" },
  { key: "linkedin", label: "LinkedIn", src: "/social/linkedin.svg" },
];

export function SocialLinks({
  social,
  className,
  idp = "sl",
}: {
  social: Social;
  className?: string;
  /** kept for call-site compatibility; ids are no longer emitted */
  idp?: string;
}) {
  void idp;

  return (
    <ul className={cn("flex flex-wrap items-center gap-3.5", className)}>
      {NETWORKS.map((n) => {
        const href = social[n.key];
        const mark = n.src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.src}
            alt=""
            width={26}
            height={26}
            loading="lazy"
            decoding="async"
            className="size-full"
          />
        ) : (
          n.glyph
        );

        return (
          <li key={n.key}>
            {href ? (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={n.label}
                className="block size-[26px] rounded-[7px] transition-transform duration-200 hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink/40"
              >
                {mark}
              </a>
            ) : (
              <span
                aria-hidden
                className="block size-[26px] rounded-[7px] opacity-35 grayscale-[35%]"
              >
                {mark}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
