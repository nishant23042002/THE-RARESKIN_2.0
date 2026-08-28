/**
 * One hidden SVG sprite of shared gradients / filters / glyphs, rendered once
 * near the top of <body>. Flacons, the campaign bottle and icon marks reference
 * these by id (`url(#glass)`, `<use href="#cbtl">`, etc.).
 */
export function SvgDefs() {
  return (
    <svg
      width={0}
      height={0}
      aria-hidden
      focusable="false"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <defs>
        <path
          id="rs-mark"
          d="M1 7 L6 1.4 L11 7"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          id="rs-arrow-right"
          d="M1 6 L11 6 M7 2 L11 6 L7 10"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          id="rs-arrow-left"
          d="M11 6 L1 6 M5 2 L1 6 L5 10"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.4}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.7" />
          <stop offset="0.12" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.85" stopColor="#2c2a26" stopOpacity="0" />
          <stop offset="1" stopColor="#2c2a26" stopOpacity="0.14" />
        </linearGradient>

        <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3a3733" />
          <stop offset="0.18" stopColor="#211f1c" />
          <stop offset="0.5" stopColor="#14120f" />
          <stop offset="0.82" stopColor="#211f1c" />
          <stop offset="1" stopColor="#050403" />
        </linearGradient>

        <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#7a5c2c" />
          <stop offset="0.3" stopColor="#c9a25e" />
          <stop offset="0.55" stopColor="#e7cf9c" />
          <stop offset="0.8" stopColor="#b0894a" />
          <stop offset="1" stopColor="#6c4f24" />
        </linearGradient>

        <linearGradient id="juiceShade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="0.16" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.8" stopColor="#000000" stopOpacity="0" />
          <stop offset="1" stopColor="#000000" stopOpacity="0.22" />
        </linearGradient>

        <filter id="grain">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves={2}
            stitchTiles="stitch"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>

        {/* campaign bottle — origin at base centre, `--cj` sets the juice */}
        <g id="cbtl">
          <ellipse cx="0" cy="24" rx="56" ry="9" fill="#000" opacity="0.16" />
          <path
            d="M-56 -6 L56 -6 L50 18 Q48 24 40 24 L-40 24 Q-48 24 -50 18 Z"
            fill="#e7e4dc"
            opacity="0.5"
          />
          <rect x="-52" y="-172" width="104" height="168" rx="6" fill="var(--cj, #d9cdb4)" />
          <rect x="-52" y="-172" width="104" height="168" rx="6" fill="url(#juiceShade)" />
          <rect x="-52" y="-172" width="104" height="168" rx="6" fill="url(#glass)" />
          <rect
            x="-52"
            y="-172"
            width="104"
            height="168"
            rx="6"
            fill="none"
            stroke="rgba(255,255,255,.28)"
          />
          <rect x="-42" y="-162" width="4" height="150" rx="2" fill="#fff" opacity="0.35" />
          <rect x="-24" y="-186" width="48" height="7" fill="url(#gold)" />
          <rect x="-14" y="-180" width="28" height="8" fill="#d9d6cd" />
          <rect x="-27" y="-232" width="54" height="46" rx="5" fill="url(#cap)" />
        </g>
      </defs>
    </svg>
  );
}
