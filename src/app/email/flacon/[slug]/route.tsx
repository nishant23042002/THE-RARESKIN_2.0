import { ImageResponse } from "next/og";

import { FRAGRANCE_PALETTE, isFragranceSlug } from "@/lib/catalog";

/**
 * A product image for the order email — an abstract flacon in the fragrance's
 * own juice colour, on warm paper. Stands in until real packshots exist in the
 * catalogue (`order-context.ts` prefers `media.*` the moment one does).
 *
 *   /email/flacon/aurevan  →  320×420 PNG
 */
export const dynamic = "force-static";
export const revalidate = 604800;

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  if (!isFragranceSlug(slug)) {
    return new Response("not found", { status: 404 });
  }
  const f = FRAGRANCE_PALETTE[slug];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f2f1ed",
        }}
      >
        <div
          style={{ display: "flex", flexDirection: "column", alignItems: "center" }}
        >
          {/* cap */}
          <div
            style={{ width: 60, height: 44, background: "#1f1b16", borderRadius: 5 }}
          />
          {/* gold collar */}
          <div style={{ width: 38, height: 7, background: "#c9a24a" }} />
          {/* body */}
          <div
            style={{
              width: 150,
              height: 208,
              marginTop: -1,
              background: f.juice,
              borderRadius: 12,
              boxShadow:
                "inset 22px 0 44px rgba(255,255,255,0.28), inset -22px 0 44px rgba(0,0,0,0.14), 0 26px 44px -22px rgba(20,16,12,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontSize: 15,
                letterSpacing: 5,
                fontWeight: 600,
                color: f.ink,
                opacity: 0.75,
              }}
            >
              {f.name}
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 320, height: 420 },
  );
}
