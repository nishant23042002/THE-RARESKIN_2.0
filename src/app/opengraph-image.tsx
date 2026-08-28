import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const alt = `${SITE.name} — ${SITE.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 84,
          background:
            "linear-gradient(150deg, #f4f1ea 0%, #ece9e1 55%, #e2ded3 100%)",
          color: "#232120",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontSize: 22,
            letterSpacing: 10,
            textTransform: "uppercase",
            color: "#6b6963",
          }}
        >
          <svg width="34" height="24" viewBox="0 0 12 8" fill="none">
            <path
              d="M1 7 L6 1.4 L11 7"
              stroke="#232120"
              strokeWidth={1.3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          The Rareskin
        </div>

        <div style={{ display: "flex", fontSize: 82, lineHeight: 1.05, maxWidth: 900 }}>
          {SITE.tagline}
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#6b6963" }}>
          Three Extrait de Parfum &nbsp;·&nbsp; Different by design
        </div>
      </div>
    ),
    size,
  );
}
