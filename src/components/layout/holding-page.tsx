import { Logo } from "@/components/ui/logo";
import { SocialLinks } from "./social-links";
import { HoldingStaffSignIn } from "./holding-staff-signin";
import type { SiteSettingsInput } from "@/lib/validation/site-settings";

/**
 * Shown for every storefront URL when `flags.maintenanceMode` is on, or before
 * `flags.storeLive` is flipped. `/admin` is a separate route group and is
 * unaffected. Rendered from `(store)/layout.tsx` in place of the shell.
 */
export function HoldingPage({ settings }: { settings: SiteSettingsInput }) {
  const maintenance = settings.flags.maintenanceMode;
  const line =
    settings.announcements.find((a) => a.active)?.text ??
    (maintenance
      ? "We're making a few changes and will be back shortly."
      : "Something worth waiting for is on its way.");

  return (
    <main
      id="main"
      className="flex min-h-svh flex-col items-center justify-center px-6 text-center"
    >
      <div className="w-full max-w-[560px]">
        <Logo
          className="mx-auto text-ink"
          style={{ width: "min(78vw, 340px)" }}
        />
        <p className="eyebrow mt-8">
          {maintenance ? "Back shortly" : "Opening soon"}
        </p>
        <p className="serif-italic mx-auto mt-4 max-w-[36ch] text-[1.15rem] leading-[1.55] text-ink-2">
          {line}
        </p>

        <p className="mt-8 text-[12px] tracking-[0.04em] text-ink-3">
          Questions?{" "}
          <a
            href={`mailto:${settings.contact.email}`}
            className="text-ink underline underline-offset-2 hover:no-underline"
          >
            {settings.contact.email}
          </a>
        </p>

        <div className="mt-6 flex justify-center">
          <SocialLinks social={settings.social} idp="holding" />
        </div>

        <HoldingStaffSignIn />
      </div>
    </main>
  );
}
