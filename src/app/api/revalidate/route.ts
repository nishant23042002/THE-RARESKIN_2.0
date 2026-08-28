import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { getEnv } from "@/server/env";

/**
 * On-demand cache revalidation.
 *
 *   POST /api/revalidate
 *   Authorization: Bearer <REVALIDATE_SECRET>
 *   { "tags": ["catalog", "product:aurevan"], "paths": ["/"] }
 *
 * With no body it revalidates the whole catalogue. Called by `pnpm revalidate`,
 * and later by the admin after an edit. Until `REVALIDATE_SECRET` is set the
 * endpoint is disabled (503).
 */
export const dynamic = "force-dynamic";

interface Body {
  tags?: string[];
  paths?: string[];
}

export async function POST(request: Request) {
  const { REVALIDATE_SECRET } = getEnv();
  if (!REVALIDATE_SECRET) {
    return NextResponse.json(
      { ok: false, error: "revalidation disabled — set REVALIDATE_SECRET" },
      { status: 503 },
    );
  }

  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (token !== REVALIDATE_SECRET) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  let body: Body = {};
  try {
    const parsed: unknown = await request.json();
    if (parsed && typeof parsed === "object") body = parsed as Body;
  } catch {
    // empty / invalid body → defaults
  }

  const tags =
    Array.isArray(body.tags) && body.tags.length > 0
      ? body.tags.filter((t) => typeof t === "string").slice(0, 50)
      : ["catalog"];
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p) => typeof p === "string" && p.startsWith("/")).slice(0, 50)
    : [];

  // { expire: 0 } — drop the entry now so the next request regenerates it.
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  for (const path of paths) revalidatePath(path);

  return NextResponse.json({ ok: true, revalidated: { tags, paths }, at: Date.now() });
}
