"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type Status = "idle" | "submitting" | "success" | "error";

const field =
  "peer w-full border-0 border-b border-line-2 bg-transparent pt-6 pb-2 text-[14px] text-ink placeholder-transparent transition-colors focus:border-ink focus:outline-none disabled:opacity-60";
const label =
  "pointer-events-none absolute left-0 top-6 text-[13px] text-ink-3 transition-all peer-focus:top-0 peer-focus:text-[10px] peer-focus:tracking-[0.12em] peer-focus:uppercase peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-[10px] peer-[:not(:placeholder-shown)]:tracking-[0.12em] peer-[:not(:placeholder-shown)]:uppercase";

function Field({
  name,
  labelText,
  type = "text",
  required,
  autoComplete,
}: {
  name: string;
  labelText: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
}) {
  const id = useId();
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={labelText}
        className={field}
      />
      <label htmlFor={id} className={label}>
        {labelText}
      </label>
    </div>
  );
}

export function ContactForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");
  const msgId = useId();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (status === "submitting") return;
    const data = new FormData(e.currentTarget);
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          phone: data.get("phone"),
          subject: data.get("subject"),
          message: data.get("message"),
        }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && json.ok) {
        setStatus("success");
      } else {
        setStatus("error");
        setMessage(json.error ?? "Something went wrong. Try again.");
      }
    } catch {
      setStatus("error");
      setMessage("Network error. Try again.");
    }
  }

  if (status === "success") {
    return (
      <p
        className="serif-italic max-w-[42ch] text-[1.15rem] leading-[1.5] text-ink-2"
        role="status"
      >
        Thank you — your message is on its way. We usually reply within a working
        day.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
      <Field name="name" labelText="Full name" required autoComplete="name" />
      <Field
        name="email"
        labelText="Email address"
        type="email"
        required
        autoComplete="email"
      />
      <Field
        name="phone"
        labelText="Phone (optional)"
        type="tel"
        autoComplete="tel"
      />
      <Field name="subject" labelText="Subject (optional)" />

      <div className="relative sm:col-span-2">
        <textarea
          id={msgId}
          name="message"
          required
          rows={4}
          placeholder="How can we help?"
          className={cn(field, "resize-y")}
        />
        <label htmlFor={msgId} className={label}>
          How can we help?
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
        <Button
          type="submit"
          variant="solid"
          size="md"
          disabled={status === "submitting"}
        >
          {status === "submitting" ? "Sending" : "Send message"}
        </Button>
        <p
          className="text-[11px] tracking-[0.03em] text-gilt/90"
          role="alert"
        >
          {status === "error" ? message : ""}
        </p>
      </div>
    </form>
  );
}
