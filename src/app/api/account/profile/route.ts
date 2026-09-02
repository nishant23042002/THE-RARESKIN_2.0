import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { profileUpdateInput } from "@/lib/validation/user";
import { getAuth } from "@/server/auth";
import { dbConnect } from "@/server/db";
import { User } from "@/server/models";

/**
 * `PATCH /api/account/profile` — a signed-in customer updates their own profile.
 * For now this is the profile-photo control; `name` / `email` /
 * `marketingConsent` are accepted too for future use.
 *
 * Changing the avatar busts the `reviews` cache tag so the PDP + homepage
 * (which live-join the avatar onto that customer's reviews) refresh.
 */
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const auth = await getAuth();
  if (!auth) {
    return NextResponse.json(
      { ok: false, error: "auth-required" },
      { status: 401 },
    );
  }

  const parsed = profileUpdateInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "bad-request", issues: parsed.error.issues.slice(0, 6) },
      { status: 400 },
    );
  }

  const set: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) set.name = parsed.data.name;
  if (parsed.data.email !== undefined) set.email = parsed.data.email;
  if (parsed.data.marketingConsent !== undefined) {
    set.marketingConsent = parsed.data.marketingConsent;
  }
  const avatarTouched = parsed.data.avatarUrl !== undefined;
  if (avatarTouched) set.avatarUrl = parsed.data.avatarUrl;

  if (Object.keys(set).length === 0) {
    return NextResponse.json({ ok: false, error: "empty" }, { status: 400 });
  }

  await dbConnect();
  await User.updateOne({ _id: auth.user.id }, { $set: set });

  if (avatarTouched) revalidateTag("reviews", { expire: 0 });

  return NextResponse.json({ ok: true, avatarUrl: parsed.data.avatarUrl ?? null });
}
