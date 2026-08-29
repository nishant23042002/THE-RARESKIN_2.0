import { ImageResponse } from "next/og";

/**
 * Masthead lockup for transactional email — the crossbar-less ∧ over the
 * wordmark, cream on ink. A hosted PNG because email clients don't render SVG
 * and block `<img>` inconsistently; the `alt` carries the name when it's off.
 *
 *   <img src={absoluteUrl("/email/logo")} width={168} height={64} alt="THE RARESKIN" />
 */
export const dynamic = "force-static";
export const revalidate = 604800; // a week

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#17140f",
        }}
      >
        <svg width="72" height="42" viewBox="0 0 12 8" fill="none">
          <path
            d="M1 7 L6 1.4 L11 7"
            stroke="#f6f4ef"
            strokeWidth={1.15}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <div
          style={{
            marginTop: 18,
            fontSize: 34,
            letterSpacing: 14,
            fontWeight: 600,
            color: "#f6f4ef",
          }}
        >
          THE RARESKIN
        </div>
      </div>
    ),
    { width: 672, height: 256 },
  );
}
