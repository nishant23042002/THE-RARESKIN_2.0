"use client";

import { useId, useRef, useState, type ReactNode } from "react";

/**
 * A small `?` help affordance. Hover or focus it to reveal a short explanatory
 * bubble. The bubble is `position: fixed` and placed from the trigger's rect so
 * it never clips inside the admin's scroll containers. Keyboard-accessible —
 * focusable, shows on focus, Escape dismisses.
 */
export function InfoTip({
  children,
  label = "What is this?",
}: {
  children: ReactNode;
  label?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const id = useId();

  function show() {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const width = 250;
    setPos({
      top: Math.round(r.bottom + 6),
      left: Math.round(
        Math.max(8, Math.min(r.left - 4, window.innerWidth - width - 8)),
      ),
    });
  }
  function hide() {
    setPos(null);
  }

  return (
    <span className="ml-1 inline-flex align-middle">
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-describedby={pos ? id : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => e.key === "Escape" && hide()}
        className="grid size-[15px] shrink-0 place-items-center rounded-full border border-line-2 text-[9px] leading-none font-medium text-ink-3 transition-colors hover:border-ink hover:text-ink"
      >
        ?
      </button>
      {pos && (
        <span
          id={id}
          role="tooltip"
          style={{ position: "fixed", top: pos.top, left: pos.left, width: 250 }}
          className="z-[120] rounded-[3px] border border-line-2 bg-surface px-2.5 py-2 text-[11.5px] leading-snug font-normal tracking-normal text-ink-2 normal-case shadow-[0_10px_28px_rgba(0,0,0,0.14)]"
        >
          {children}
        </span>
      )}
    </span>
  );
}
