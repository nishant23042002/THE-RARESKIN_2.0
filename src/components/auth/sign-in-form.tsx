"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useAuth } from "@/components/providers/auth-provider";
import { normalizeIndianMobile, maskPhone, OTP_LENGTH } from "@/lib/auth";
import { TurnstileWidget, turnstileEnabled } from "./turnstile-widget";
import { OtpInput } from "./otp-input";

type Phase = "phone" | "code";
type Field = "phone" | "code" | null;

/** cooldown (seconds) before the next resend is allowed — escalates each time */
const RESEND_COOLDOWNS = [30, 45, 60, 90];
/** the server allows 5 sends / 15 min / number: 1 initial + this many resends */
const MAX_RESENDS = 4;

function errorText(code: string): string {
  switch (code) {
    case "invalid-phone":
      return "Please enter a valid 10-digit Indian mobile number.";
    case "rate-limited":
      return "Too many attempts. Please wait a moment and try again.";
    case "challenge-failed":
      return "Verification could not be completed. Please refresh the page and try again.";
    case "send-failed":
    case "provider-error":
      return "The verification service is temporarily unavailable. Please try again shortly.";
    case "invalid-code":
      return "That code is incorrect. Please check it and try again.";
    case "too-many-attempts":
      return "Too many incorrect attempts. Request a new code to continue.";
    case "no-challenge":
      return "This code has expired. Please request a new one.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** group as `90112 85958` while typing */
function displayPhone(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

/**
 * The body of the sign-in modal. Phone → one-time code, no password. First-time
 * numbers get an account automatically. `onAuthenticated` fires once the
 * session is live so the modal can hand off to the page transition.
 */
/** `"1"` (build-time) shows "Continue with Google" — the client can't read the
 *  server OAuth keys, so this env var mirrors whether they're set. */
const googleAuthEnabled = process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED === "1";

export function SignInForm({
  onAuthenticated,
  next = "/account",
  authError = null,
  variant = "store",
}: {
  onAuthenticated: () => void;
  /** where to land after sign-in — passed to the Google full-page redirect */
  next?: string;
  /** a message from a failed Google redirect, shown above the phone step */
  authError?: string | null;
  /** `"studio"` tailors the copy for a staff member bounced from `/admin` */
  variant?: "store" | "studio";
}) {
  const { refresh } = useAuth();
  const isStudio = variant === "studio";

  const [phase, setPhase] = useState<Phase>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "verifying">("idle");
  const [error, setError] = useState<{ message: string; field: Field } | null>(
    null,
  );
  const [notice, setNotice] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [resendCount, setResendCount] = useState(0);
  const [codeKey, setCodeKey] = useState(0);

  const busy = status !== "idle";
  const normalized = normalizeIndianMobile(phone);
  const codeInvalid = error?.field === "code";
  const phoneInvalid = error?.field === "phone";

  const handleToken = useCallback((t: string | null) => setTurnstileToken(t), []);

  // countdown tick
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  const verifyRef = useRef<(code: string) => void>(() => {});

  // ── request a code ─────────────────────────────────────────────────────

  const send = useCallback(
    async (isResend: boolean) => {
      setError(null);
      setNotice(null);
      if (!normalized) {
        setError({ message: errorText("invalid-phone"), field: "phone" });
        return;
      }
      if (turnstileEnabled && !turnstileToken) {
        setError({
          message: "Please complete the verification challenge first.",
          field: null,
        });
        return;
      }
      setStatus("sending");
      try {
        const res = await fetch("/api/auth/otp/start", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: normalized, turnstileToken }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          devCode?: string;
          retryAfter?: number;
        };
        if (!res.ok || !data.ok) {
          if (data.error === "rate-limited" && data.retryAfter) {
            setCooldown(Math.min(600, data.retryAfter));
          }
          setError({
            message: errorText(data.error ?? "unknown"),
            field: isResend ? "code" : "phone",
          });
          return;
        }
        setDevCode(data.devCode ?? null);
        if (isResend) {
          setResendCount((n) => n + 1);
          setCooldown(RESEND_COOLDOWNS[Math.min(resendCount, RESEND_COOLDOWNS.length - 1)]);
          setCode("");
          setCodeKey((k) => k + 1);
          setNotice("A new code has been sent.");
        } else {
          setCooldown(RESEND_COOLDOWNS[0]);
          setResendCount(0);
          setCode("");
          setPhase("code");
        }
      } catch {
        setError({ message: errorText("send-failed"), field: null });
      } finally {
        setStatus("idle");
      }
    },
    [normalized, turnstileToken, resendCount],
  );

  // ── verify a code ──────────────────────────────────────────────────────

  const verify = useCallback(
    async (submitted: string) => {
      if (submitted.length !== OTP_LENGTH || busy) return;
      setError(null);
      setNotice(null);
      setStatus("verifying");
      try {
        const res = await fetch("/api/auth/otp/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ phone: normalized, code: submitted }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          burned?: boolean;
          retryAfter?: number;
        };
        if (!res.ok || !data.ok) {
          if (data.error === "rate-limited" && data.retryAfter) {
            setCooldown(Math.min(600, data.retryAfter));
          }
          setError({
            message: errorText(data.error ?? "invalid-code"),
            field: "code",
          });
          setCode("");
          setCodeKey((k) => k + 1);
          return;
        }
        await refresh();
        onAuthenticated();
      } catch {
        setError({ message: errorText("unknown"), field: "code" });
        setCode("");
        setCodeKey((k) => k + 1);
      } finally {
        setStatus("idle");
      }
    },
    [normalized, busy, refresh, onAuthenticated],
  );

  useEffect(() => {
    verifyRef.current = verify;
  }, [verify]);

  // ── WebOTP: auto-read the SMS code on supporting devices (Android Chrome) ─

  useEffect(() => {
    if (phase !== "code") return;
    if (
      typeof window === "undefined" ||
      !("OTPCredential" in window) ||
      !navigator.credentials?.get
    ) {
      return;
    }
    const ac = new AbortController();
    void navigator.credentials
      .get({
        otp: { transport: ["sms"] },
        signal: ac.signal,
      } as unknown as CredentialRequestOptions)
      .then((cred) => {
        const otp = (cred as { code?: string } | null)?.code ?? "";
        if (new RegExp(`^\\d{${OTP_LENGTH}}$`).test(otp)) {
          setCode(otp);
          verifyRef.current(otp);
        }
      })
      .catch(() => {
        /* aborted or unsupported — the manual field still works */
      });
    return () => ac.abort();
  }, [phase]);

  const backToPhone = () => {
    setPhase("phone");
    setCode("");
    setError(null);
    setNotice(null);
    setCooldown(0);
    setResendCount(0);
  };

  const resendDisabled = cooldown > 0 || busy || resendCount >= MAX_RESENDS;
  const canResend = !resendDisabled;

  // ── render ─────────────────────────────────────────────────────────────

  return (
    <div>
      {phase === "phone" ? (
        <form
          key="phone"
          className="signin-step flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void send(false);
          }}
        >
          {authError && (
            <p className="flex items-start gap-2 rounded-[3px] border border-error/40 bg-error/5 px-3 py-2.5 text-[12.5px] leading-[1.5] text-error">
              <AlertIcon />
              {authError}
            </p>
          )}

          <p className="text-[14px] leading-[1.6] text-ink-2">
            {isStudio ? (
              <>
                Enter the mobile number your Studio access is registered to.
                We&rsquo;ll send a one-time code by SMS.
              </>
            ) : (
              <>
                Enter your mobile number to receive a one-time verification code
                by SMS. First-time customers are registered automatically.
              </>
            )}
          </p>

          <label className="flex flex-col gap-2">
            <span className="text-[10px] tracking-[0.16em] text-ink-3 uppercase">
              Mobile number
            </span>
            <div
              className={cn(
                "flex items-center gap-2.5 border-b transition-colors",
                phoneInvalid
                  ? "border-error focus-within:border-error"
                  : "border-line-2 focus-within:border-ink",
              )}
            >
              <span className="text-[15px] text-ink-3">+91</span>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                autoFocus
                aria-invalid={phoneInvalid || undefined}
                value={displayPhone(phone)}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                  if (error) setError(null);
                }}
                placeholder="90112 85958"
                className="w-full bg-transparent py-2.5 text-[16px] tracking-[0.08em] outline-none placeholder:text-ink-3/50"
              />
            </div>
          </label>

          {turnstileEnabled && (
            <div>
              <TurnstileWidget onToken={handleToken} />
            </div>
          )}

          <div className="mt-1">
            <Button
              type="submit"
              variant="solid"
              size="lg"
              disabled={busy}
              className="w-full"
            >
              {status === "sending" ? "Sending code…" : "Send verification code"}
            </Button>
          </div>

          {googleAuthEnabled && (
            <>
              <div className="flex items-center gap-3 text-[10px] tracking-[0.16em] text-ink-3 uppercase">
                <span className="h-px flex-1 bg-line-2" />
                or
                <span className="h-px flex-1 bg-line-2" />
              </div>
              <a
                href={`/api/auth/google/start?mode=signin&next=${encodeURIComponent(next)}`}
                className="flex w-full items-center justify-center gap-2.5 rounded-[2px] border border-line-2 px-4 py-3.5 text-[11px] tracking-[0.14em] text-ink uppercase transition-colors hover:border-ink"
              >
                <GoogleG />
                Continue with Google
              </a>
            </>
          )}

          {error && (
            <p role="alert" className="flex items-start gap-2 text-[13px] text-error">
              <AlertIcon />
              {error.message}
            </p>
          )}
        </form>
      ) : (
        <form
          key="code"
          className="signin-step flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            void verify(code);
          }}
        >
          <div className="flex flex-col gap-1.5">
            <button
              type="button"
              onClick={backToPhone}
              className="-ml-1 inline-flex w-fit items-center gap-1.5 rounded-[2px] px-1 py-0.5 text-[12px] text-ink-2 transition-colors hover:text-ink"
            >
              <svg viewBox="0 0 12 12" className="w-2.5" aria-hidden>
                <path
                  d="M7.5 1.5 L3 6 L7.5 10.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Edit number
            </button>
            <p className="text-[14px] leading-[1.6] text-ink-2">
              We&rsquo;ve sent a {OTP_LENGTH}-digit code to{" "}
              <span className="whitespace-nowrap font-medium text-ink">
                {normalized ? maskPhone(normalized) : "your number"}
              </span>
              .
            </p>
          </div>

          <div>
            <OtpInput
              key={codeKey}
              value={code}
              onChange={(v) => {
                setCode(v);
                if (error) setError(null);
              }}
              onComplete={(c) => void verify(c)}
              disabled={busy}
              autoFocus
              invalid={codeInvalid}
            />
          </div>

          {devCode && (
            <p className="rounded-[3px] border border-line-2 bg-surface-2 px-3 py-2 text-[12px] text-ink-2">
              Development mode — your code is{" "}
              <b className="tracking-[0.12em]">{devCode}</b>
            </p>
          )}

          <div aria-live="polite" className="min-h-[18px]">
            {error ? (
              <p role="alert" className="flex items-start gap-2 text-[13px] text-error">
                <AlertIcon />
                {error.message}
              </p>
            ) : notice ? (
              <p className="flex items-start gap-2 text-[13px] text-ok">
                <CheckIcon />
                {notice}
              </p>
            ) : null}
          </div>

          <div className="mt-1">
            <Button
              type="submit"
              variant="solid"
              size="lg"
              disabled={busy || code.length !== OTP_LENGTH}
              className="w-full"
            >
              {status === "verifying" ? "Verifying…" : "Verify and sign in"}
            </Button>
          </div>

          <p className="text-center text-[13px] leading-[1.6] text-ink-2">
            Didn&rsquo;t receive it?{" "}
            {resendCount >= MAX_RESENDS ? (
              <span className="text-ink-3">
                Resend limit reached — edit the number or try again shortly.
              </span>
            ) : cooldown > 0 ? (
              <span className="text-ink-3 tabular-nums">
                Resend available in {cooldown}s
              </span>
            ) : (
              <button
                type="button"
                disabled={!canResend}
                onClick={() => void send(true)}
                className="font-medium text-ink underline decoration-line-2 underline-offset-2 transition-colors hover:decoration-ink disabled:no-underline disabled:text-ink-3"
              >
                {status === "sending" ? "Sending…" : "Resend code"}
              </button>
            )}
          </p>
        </form>
      )}
    </div>
  );
}

function GoogleG() {
  return (
    <svg viewBox="0 0 18 18" className="w-4 shrink-0" aria-hidden>
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
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-[3px] w-3.5 shrink-0"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 1.5 L15 14 L1 14 Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M8 6 V9.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <circle cx="8" cy="11.6" r="0.75" fill="currentColor" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="mt-[3px] w-3.5 shrink-0"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 8.5 L6.5 12 L13 4.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
