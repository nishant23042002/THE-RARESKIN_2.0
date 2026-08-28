import { cn } from "@/lib/cn";
import { FRAGRANCE_PALETTE, type FragranceSlug } from "@/lib/catalog";

/**
 * Vector stand-in for the real flacon photography: clear rectangular bottle,
 * matte black cap, thin gold collar, on-glass label. Colour of the juice and
 * the label ink come from the product record. Gradients (`#glass`, `#cap`,
 * `#gold`, `#juiceShade`) live in <SvgDefs />, rendered once in the layout.
 *
 * Swap for <Image> when real packshots land — same footprint, `images.flat`.
 */
export function Flacon({
  fragrance,
  label = false,
  volume = false,
  className,
}: {
  fragrance: FragranceSlug;
  /** render the on-glass label (name + type) */
  label?: boolean;
  /** add the "50 ml | 1.7 FL.OZ" line (implies label) */
  volume?: boolean;
  className?: string;
}) {
  const f = FRAGRANCE_PALETTE[fragrance];
  const ink = f.ink;
  const showLabel = label || volume;

  return (
    <svg
      viewBox="0 0 160 320"
      role="img"
      aria-label={`${f.name} bottle`}
      className={cn("block h-auto w-full overflow-visible", className)}
    >
      <ellipse cx="80" cy="300" rx="58" ry="9" fill="#2c2a26" opacity="0.16" />
      <path
        d="M34 250 L126 250 L120 288 Q118 294 110 294 L50 294 Q42 294 40 288 Z"
        fill="#e7e4dc"
        stroke="#c7c5bc"
        strokeWidth="1"
      />
      <rect x="30" y="84" width="100" height="176" rx="6" fill="#eceae3" />
      <rect x="30" y="84" width="100" height="176" rx="6" fill={f.juice} opacity="0.9" />
      <rect x="30" y="84" width="100" height="176" rx="6" fill="url(#juiceShade)" />
      <rect x="33" y="96" width="94" height="3" fill="#ffffff" opacity="0.25" />
      <rect x="30" y="84" width="100" height="176" rx="6" fill="url(#glass)" />
      <rect
        x="30"
        y="84"
        width="100"
        height="176"
        rx="6"
        fill="none"
        stroke="#c9c6bd"
        strokeWidth="1"
      />
      <rect x="40" y="92" width="4" height="160" rx="2" fill="#ffffff" opacity="0.4" />

      {showLabel && (
        <g fontFamily="Jost, sans-serif" fill={ink} textAnchor="middle">
          <text x="80" y="150" fontSize="6.5" letterSpacing="2.2">
            THE RARESKIN
          </text>
          <line x1="73" y1="157" x2="87" y2="157" stroke={ink} strokeWidth="0.6" />
          <text x="80" y="180" fontSize="10.5" letterSpacing="3">
            {f.name}
          </text>
          <text x="80" y="196" fontSize="4.6" letterSpacing="1.6">
            EXTRAIT DE PARFUM
          </text>
          {volume && (
            <text x="80" y="252" fontSize="4.6" letterSpacing="1.1">
              {`${f.volumeMl} ml  |  1.7 FL.OZ`}
            </text>
          )}
        </g>
      )}

      <rect x="56" y="70" width="48" height="7" fill="url(#gold)" />
      <rect x="66" y="76" width="28" height="9" fill="#d9d6cd" />
      <rect x="52" y="8" width="56" height="64" rx="6" fill="url(#cap)" />
      <rect x="58" y="12" width="20" height="4" rx="2" fill="#ffffff" opacity="0.14" />
    </svg>
  );
}
