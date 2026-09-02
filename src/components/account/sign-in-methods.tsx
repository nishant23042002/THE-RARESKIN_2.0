"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

import { maskPhone, type SignInMethodsView as Methods } from "@/lib/auth";

/**
 * The "Sign-in methods" section, shared by `/account` (customers) and
 * `/admin/account` (staff). Phone is always present; Google can be linked once
 * and then used instead of an OTP.
 */
export function SignInMethods({ methods }: { methods: Methods }) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  const linkHref = `/api/auth/google/start?mode=link&next=${encodeURIComponent(
    pathname || "/account",
  )}`;

  async function unlink() {
    setBusy(true);
    try {
      await fetch("/api/auth/account/google/unlink", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
      setConfirmUnlink(false);
    }
  }

  const linkedSince = methods.google
    ? new Date(methods.google.linkedAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  return (
    <section>
      <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
        Sign-in methods
      </h2>

      <ul className="mt-4 divide-y divide-line border-y border-line">
        {/* Phone — always */}
        <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3.5">
          <div className="flex items-center gap-3">
            <PhoneMark />
            <div>
              <p className="text-[13px] text-ink">Phone &amp; OTP</p>
              <p className="text-[12px] text-ink-3">
                {methods.phone ? maskPhone(methods.phone) : "—"}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase">
            Primary
          </span>
        </li>

        {/* Google */}
        <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3.5">
          <div className="flex items-center gap-3">
            <GoogleMark />
            <div>
              <p className="text-[13px] text-ink">Google</p>
              {methods.google ? (
                <p className="text-[12px] text-ink-3">
                  {methods.google.email} · linked {linkedSince}
                </p>
              ) : (
                <p className="text-[12px] text-ink-3">
                  {methods.googleConfigured
                    ? "Not linked — skip the SMS code on future sign-ins."
                    : "Not available on this environment."}
                </p>
              )}
            </div>
          </div>

          {methods.googleConfigured &&
            (methods.google ? (
              confirmUnlink ? (
                <span className="flex items-center gap-2 text-[11px]">
                  <span className="text-ink-3">Unlink Google?</span>
                  <button
                    type="button"
                    onClick={unlink}
                    disabled={busy}
                    className="font-medium text-error uppercase tracking-[0.08em] disabled:opacity-50"
                  >
                    {busy ? "…" : "Yes"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmUnlink(false)}
                    className="text-ink-3 uppercase tracking-[0.08em]"
                  >
                    No
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmUnlink(true)}
                  className="rounded-[2px] border border-line-2 px-3 py-1.5 text-[10px] tracking-[0.12em] text-ink-2 uppercase hover:border-ink hover:text-ink"
                >
                  Unlink
                </button>
              )
            ) : (
              <a
                href={linkHref}
                className="rounded-[2px] border border-ink bg-ink px-3 py-1.5 text-[10px] tracking-[0.12em] text-w0 uppercase hover:bg-black"
              >
                Link Google account
              </a>
            ))}
        </li>
      </ul>

      {methods.google && (
        <p className="mt-3 text-[11.5px] leading-[1.6] text-ink-3">
          Your phone stays on the account — unlinking Google never locks you out.
        </p>
      )}
    </section>
  );
}

function PhoneMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-2 text-ink-2">
      <svg viewBox="0 0 16 16" className="w-3.5" fill="none" aria-hidden>
        <rect
          x="4.5"
          y="1.5"
          width="7"
          height="13"
          rx="1.4"
          stroke="currentColor"
          strokeWidth="1.3"
        />
        <path d="M7 12.4h2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function GoogleMark() {
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line-2">
      <svg viewBox="0 0 18 18" className="w-4" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
    </span>
  );
}
