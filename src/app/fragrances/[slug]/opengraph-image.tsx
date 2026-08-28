import { ImageResponse } from "next/og";
import { ORDER, getFragrance, isFragranceSlug } from "@/lib/products";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "THE RARESKIN Extrait de Parfum";
export const dynamicParams = false;

export function generateStaticParams() {
  return ORDER.map((slug) => ({ slug }));
}

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = getFragrance(isFragranceSlug(slug) ? slug : "aurevan");

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
          background: f.ground,
          color: f.onGround,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 20,
            letterSpacing: 10,
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          The Rareskin &nbsp;·&nbsp; Extrait de Parfum
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 100, letterSpacing: 6, lineHeight: 1 }}>
            {f.name}
          </div>
          <div style={{ display: "flex", fontSize: 30, marginTop: 20, opacity: 0.82 }}>
            {f.title}
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 22, opacity: 0.72 }}>
          {f.mood.join("   ·   ")}
        </div>
      </div>
    ),
    size,
  );
}
