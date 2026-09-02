"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { AuthProvider } from "@/components/providers/auth-provider";
import { SignInForm } from "@/components/auth/sign-in-form";

/**
 * The one way in while the storefront is a holding page: a collapsed "team
 * member" sign-in. Signed-in staff bypass the holding page (see
 * `(store)/layout.tsx`), so a successful sign-in here just reloads into the
 * real site / Studio. Self-contained — its own `<AuthProvider>`, no modal
 * machinery, no storefront providers.
 */
export function HoldingStaffSignIn() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-14 border-t border-line pt-6">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] tracking-[0.14em] text-ink-3 uppercase transition-colors hover:text-ink"
        >
          Team member? Sign in
        </button>
      ) : (
        <div className="mx-auto max-w-[340px] text-left">
          <div className="mb-4 flex items-baseline justify-between">
            <p className="text-[10px] font-medium tracking-[0.22em] text-ink-3 uppercase">
              Studio · Staff access
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11px] text-ink-3 uppercase hover:text-ink"
            >
              Close
            </button>
          </div>
          <AuthProvider>
            <SignInForm
              variant="studio"
              next="/admin"
              onAuthenticated={() => {
                router.push("/admin");
                router.refresh();
              }}
            />
          </AuthProvider>
        </div>
      )}
    </div>
  );
}
