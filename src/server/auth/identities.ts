import "server-only";

import { dbConnect } from "@/server/db";
import { User } from "@/server/models";
import { isGoogleAuthConfigured } from "@/server/env";
import type { SignInMethodsView } from "@/lib/auth";

/** Build the "Sign-in methods" view for an account (phone + optional Google). */
export async function getSignInMethods(
  userId: string,
): Promise<SignInMethodsView> {
  await dbConnect();
  const user = await User.findById(userId)
    .select("phone google")
    .lean<{
      phone: string;
      google: {
        email: string;
        name: string | null;
        linkedAt: Date;
        lastUsedAt: Date | null;
      } | null;
    } | null>();

  return {
    phone: user?.phone ?? "",
    google: user?.google
      ? {
          email: user.google.email,
          name: user.google.name,
          linkedAt: new Date(user.google.linkedAt).toISOString(),
          lastUsedAt: user.google.lastUsedAt
            ? new Date(user.google.lastUsedAt).toISOString()
            : null,
        }
      : null,
    googleConfigured: isGoogleAuthConfigured(),
  };
}
