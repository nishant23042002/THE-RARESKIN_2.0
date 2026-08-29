"use client";

import {
  useEffect,
  useRef,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";

import { cn } from "@/lib/cn";
import { OTP_LENGTH } from "@/lib/auth";

/**
 * Segmented one-time-code field, THE RARESKIN style: no boxes, just a row of
 * hairline underlines. A filled digit sits in ink over a gilt rule; the active
 * slot's rule goes to ink. Auto-advances, handles paste and backspace.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled,
  autoFocus,
  invalid,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** paint the field in the error colour (wrong / expired code) */
  invalid?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split("").slice(0, OTP_LENGTH);

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function set(index: number, char: string) {
    const arr = value.split("");
    arr[index] = char;
    const next = arr.join("").replace(/\D/g, "").slice(0, OTP_LENGTH);
    onChange(next);
    if (char && index < OTP_LENGTH - 1) refs.current[index + 1]?.focus();
    // fire only when this edit *completes* the code — never on every keystroke
    // of an already-full code (which would re-submit a wrong code and burn
    // attempts while the user fixes a digit).
    if (next.length === OTP_LENGTH && value.length < OTP_LENGTH) {
      onComplete?.(next);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      e.preventDefault();
      refs.current[index - 1]?.focus();
      set(index - 1, "");
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      refs.current[index + 1]?.focus();
    }
  }

  function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData("text")
      .replace(/\D/g, "")
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const focusAt = Math.min(pasted.length, OTP_LENGTH - 1);
    refs.current[focusAt]?.focus();
    if (pasted.length === OTP_LENGTH && value.length < OTP_LENGTH) {
      onComplete?.(pasted);
    }
  }

  return (
    <div
      className="flex justify-center gap-2.5 sm:gap-3"
      role="group"
      aria-label={`${OTP_LENGTH}-digit verification code`}
    >
      {Array.from({ length: OTP_LENGTH }).map((_, i) => {
        const filled = Boolean(digits[i]);
        return (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="text"
            name={i === 0 ? "otp" : undefined}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={invalid || undefined}
            maxLength={1}
            disabled={disabled}
            value={digits[i] ?? ""}
            onChange={(e) => set(i, e.target.value.replace(/\D/g, "").slice(-1))}
            onKeyDown={(e) => onKeyDown(e, i)}
            onPaste={onPaste}
            onFocus={(e) => e.currentTarget.select()}
            className={cn(
              "h-12 w-full min-w-0 max-w-[3.25rem] bg-transparent pb-1 text-center text-[22px] font-light tabular-nums outline-none transition-colors sm:text-[26px]",
              "border-b-2",
              invalid
                ? "border-error text-error caret-error"
                : filled
                  ? "border-gilt text-ink caret-ink"
                  : "border-line-2 text-ink-2 caret-ink",
              invalid ? "focus:border-error" : "focus:border-ink",
            )}
          />
        );
      })}
    </div>
  );
}
