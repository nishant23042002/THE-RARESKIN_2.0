"use client";

import { useId, useState } from "react";
import { Container } from "@/components/ui/container";

type Status = "idle" | "submitting" | "success" | "error";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const inputId = useId();

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "submitting") return;
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  return (
    <section id="letter" className="border-t border-line bg-w4 text-w0">
      <Container className="py-[clamp(72px,11vw,128px)] text-center">
        <span className="eyebrow text-w0/68">The Letter</span>
        <h2 className="serif-italic mx-2 mt-3.5 mb-2 text-[clamp(1.7rem,3.8vw,2.6rem)]">
          One note when something new arrives.
        </h2>
        <p className="text-[13.5px] text-w0/60">
          No more than one a month. Nothing else.
        </p>

        {status === "success" ? (
          <p
            className="serif-italic mx-auto mt-8 max-w-[420px] text-[1.15rem] text-w0/85"
            role="status"
          >
            You&rsquo;re on the list. Look out for the first note.
          </p>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="mx-auto mt-8 flex max-w-[420px] items-center border-b border-w0/40"
          >
            <label htmlFor={inputId} className="sr-only">
              Email address
            </label>
            <input
              id={inputId}
              type="email"
              required
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (status === "error") setStatus("idle");
              }}
              disabled={status === "submitting"}
              className="flex-1 bg-transparent px-1 py-3 text-[14px] text-w0 placeholder:text-w0/65 focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={status === "submitting"}
              className="group inline-flex items-center gap-2 px-2 py-3 text-[11px] tracking-[0.14em] text-w0 uppercase disabled:opacity-60"
            >
              {status === "submitting" ? "Joining" : "Join"}
              <span
                aria-hidden
                className="text-gilt transition-transform duration-300 group-hover:translate-x-1"
              >
                &rarr;
              </span>
            </button>
          </form>
        )}

        <p
          className="mt-3 min-h-[1.2em] text-[11px] tracking-[0.04em] text-gilt/90"
          role="alert"
        >
          {status === "error" ? message : ""}
        </p>
      </Container>
    </section>
  );
}
