"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { OtpInput } from "@/components/auth/otp-input";
import { Icon } from "@/components/ui/icon";
import { OTP_LENGTH } from "@/lib/auth";

/**
 * Re-authentication dialog for dangerous admin actions. Opens → sends an OTP to
 * the staff member's own phone → on a correct code the session is elevated
 * (`sudoUntil`) and `onConfirmed()` runs the gated action. A `409
 * { error: "sudo-required" }` from any admin route is the cue to open this.
 */
export function SudoGate({
  open,
  title = "Confirm it's you",
  detail,
  onCancel,
  onConfirmed,
}: {
  open: boolean;
  title?: string;
  detail?: string;
  onCancel: () => void;
  onConfirmed: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState("");
  const [phase, setPhase] = useState<"sending" | "ready" | "verifying">("sending");
  const [error, setError] = useState<string | null>(null);
  const [devCode, setDevCode] = useState<string | null>(null);

  const start = useCallback(async () => {
    setPhase("sending");
    setError(null);
    setCode("");
    try {
      const res = await fetch("/api/admin/sudo/start", { method: "POST" });
      const json = await res.json();
      if (!json.ok) {
        setError(messageFor(json.error));
        setPhase("ready");
        return;
      }
      setDevCode(json.devCode ?? null);
      setPhase("ready");
    } catch {
      setError("Couldn't send a code. Check your connection and retry.");
      setPhase("ready");
    }
  }, []);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      void start();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open, start]);

  async function verify(value: string) {
    setPhase("verifying");
    setError(null);
    try {
      const res = await fetch("/api/admin/sudo/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: value }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(messageFor(json.error));
        setCode("");
        setPhase("ready");
        return;
      }
      onConfirmed();
    } catch {
      setError("Something went wrong. Try again.");
      setPhase("ready");
    }
  }

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        onCancel();
      }}
      className="ui-surface m-auto w-[min(92vw,380px)] border border-line bg-surface p-0 text-ink backdrop:bg-ink/40"
    >
      <div className="border-b border-line px-5 py-3">
        <div className="flex items-center gap-2">
          <Icon name="lock" className="size-4 text-ink-2" />
          <h2 className="text-[13px] font-medium tracking-[0.02em]">{title}</h2>
        </div>
      </div>

      <div className="px-5 py-5">
        <p className="text-[12.5px] leading-relaxed text-ink-2">
          {detail ??
            "This action needs a fresh check. Enter the code we just sent to your phone."}
        </p>

        {devCode && (
          <p className="mt-2 text-[11px] text-ink-3">
            Dev code: <span className="tabular-nums text-ink">{devCode}</span>
          </p>
        )}

        <div className="mt-4">
          <OtpInput
            value={code}
            onChange={setCode}
            onComplete={verify}
            disabled={phase === "sending" || phase === "verifying"}
            invalid={Boolean(error)}
            autoFocus
          />
        </div>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-error">
            <Icon name="alert" className="size-3.5" />
            {error}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => void start()}
            disabled={phase === "sending" || phase === "verifying"}
            className="text-[11px] tracking-[0.04em] text-ink-3 uppercase hover:text-ink disabled:opacity-40"
          >
            {phase === "sending" ? "Sending…" : "Resend code"}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] tracking-[0.04em] text-ink-2 uppercase hover:border-ink hover:text-ink"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => code.length === OTP_LENGTH && verify(code)}
              disabled={code.length !== OTP_LENGTH || phase === "verifying"}
              className="rounded-[3px] bg-cta px-3 py-1.5 text-[11px] tracking-[0.04em] text-w0 uppercase hover:bg-black disabled:opacity-40"
            >
              {phase === "verifying" ? "Checking…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

function messageFor(error: string | undefined): string {
  switch (error) {
    case "rate-limited":
      return "Too many attempts. Wait a few minutes and try again.";
    case "invalid-code":
    case "no-challenge":
      return "That code isn't right. Check it or resend.";
    case "too-many-attempts":
    case "burned":
      return "That code is used up. Resend a new one.";
    case "invalid-phone":
      return "We couldn't send a code to your number.";
    default:
      return "Couldn't verify the code. Try again.";
  }
}
