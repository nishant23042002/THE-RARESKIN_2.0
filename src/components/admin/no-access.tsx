import { Mark } from "@/components/ui/mark";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/server/auth";
import { maskPhone } from "@/lib/auth";

import { SwitchAccountButton } from "./switch-account-button";

/**
 * The admin "no access" screen. Rendered by `forbidden.tsx` boundaries when a
 * guard in `@/server/auth/admin` calls `forbidden()`.
 *
 * - `variant="studio"` — a customer (or any non-staff account) landed on
 *   `/admin`. Caught by the root `src/app/forbidden.tsx`, so it renders on a
 *   bare page with no chrome.
 * - `variant="section"` — a staff member opened a section their role doesn't
 *   cover (e.g. `support` on the catalogue). Caught by
 *   `src/app/(admin)/forbidden.tsx`, inside the admin shell.
 *
 * It names the signed-in account so the person can tell they're logged in as
 * the wrong one, and offers a way back to the store plus a one-click account
 * switch.
 */
export async function NoAccess({
  variant = "studio",
}: {
  variant?: "studio" | "section";
}) {
  const user = await getCurrentUser();
  const account =
    user?.email || (user?.phone ? maskPhone(user.phone) : null);

  const heading =
    variant === "section"
      ? "This part of Studio is off-limits"
      : "You don't have access to Studio";

  const body =
    variant === "section"
      ? "Your role doesn't cover this section. Ask an administrator to widen your access, or head back to the areas you can work in."
      : "Studio is the team's back office. This account can shop and manage its own orders, but it isn't a staff account — so there's nothing for it here.";

  return (
    <main
      id="main"
      className="flex min-h-svh flex-col items-center justify-center px-6 text-center"
    >
      <div className="w-full max-w-[520px]">
        <Mark className="mx-auto w-11 text-ink" />
        <p className="eyebrow mt-6">403 · No access</p>
        <h1 className="mt-3 text-[clamp(1.7rem,4.5vw,2.5rem)] leading-[1.15]">
          {heading}
        </h1>
        <p className="serif-italic mx-auto mt-4 max-w-[42ch] text-[1.05rem] leading-[1.55] text-ink-2">
          {body}
        </p>

        {account && (
          <p className="mt-5 text-[12px] tracking-[0.04em] text-ink-3">
            Signed in as <span className="text-ink">{account}</span>
          </p>
        )}

        <div className="mt-7 flex flex-wrap justify-center gap-2.5">
          {variant === "section" ? (
            <Button href="/admin" variant="solid" size="sm">
              Back to Studio
            </Button>
          ) : (
            <>
              <Button href="/" variant="solid" size="sm">
                Back to the store
              </Button>
              <SwitchAccountButton />
            </>
          )}
        </div>

        {variant === "studio" && (
          <p className="mx-auto mt-8 max-w-[40ch] text-[11.5px] leading-[1.6] text-ink-3">
            If you&rsquo;re a team member, you may be signed in with a personal
            account. Switch accounts, or ask an administrator to grant this one
            staff access.
          </p>
        )}
      </div>
    </main>
  );
}
