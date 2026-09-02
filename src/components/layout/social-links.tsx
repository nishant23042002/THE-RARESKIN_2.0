import type { SiteSettingsInput } from "@/lib/validation/site-settings";

type Social = SiteSettingsInput["social"];

const ORDER: { key: keyof Social; label: string }[] = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X" },
  { key: "linkedin", label: "LinkedIn" },
];

/**
 * Text social links from Site Settings. Renders nothing when none are set —
 * used by the footer and the holding page.
 */
export function SocialLinks({
  social,
  className,
}: {
  social: Social;
  className?: string;
}) {
  const links = ORDER.filter((o) => social[o.key]);
  if (links.length === 0) return null;

  return (
    <ul
      className={
        className ??
        "flex flex-wrap gap-x-4 gap-y-1 text-[11px] tracking-[0.08em] text-ink-3 uppercase"
      }
    >
      {links.map((o) => (
        <li key={o.key}>
          <a
            href={social[o.key]}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-ink"
          >
            {o.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
