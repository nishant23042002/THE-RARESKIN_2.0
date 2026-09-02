"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Field, TextInput, Select } from "@/components/admin/field";
import { Icon } from "@/components/ui/icon";
import { SudoGate } from "@/components/admin/sudo-gate";
import { ROLE_LABEL } from "@/lib/admin";
import { STAFF_ROLES, type UserRole } from "@/lib/validation/user";

const BELOW_ADMIN: UserRole[] = ["support", "catalog_manager", "operations"];

export function StaffInviteForm({ isSuperadmin }: { isSuperadmin: boolean }) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<UserRole>("support");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sudoOpen, setSudoOpen] = useState(false);

  const roles = (isSuperadmin ? STAFF_ROLES : BELOW_ADMIN) as readonly UserRole[];

  async function submit() {
    setError(null);
    setNotice(null);
    if (!/^\d{10}$/.test(phone.replace(/\D/g, "").slice(-10))) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    if (!name.trim()) {
      setError("A name is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          phone: `+91${phone.replace(/\D/g, "").slice(-10)}`,
          name: name.trim(),
          email: email.trim() || undefined,
          role,
        }),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError(
          json.error === "requires-superadmin"
            ? "Only a superadmin can grant that role."
            : json.error === "invalid-phone"
              ? "That doesn't look like a valid number."
              : "Couldn't add that person.",
        );
        return;
      }
      setNotice(
        json.created ? "Account created." : "Existing account promoted.",
      );
      setPhone("");
      setName("");
      setEmail("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Add / promote">
      <div className="grid gap-3">
        <Field label="Mobile number" info="Their account is keyed on this. They sign in with an OTP to it.">
          <div className="flex items-center gap-2 border border-line-2 bg-surface px-2.5">
            <span className="text-[12.5px] text-ink-3">+91</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              inputMode="numeric"
              placeholder="90112 85958"
              className="w-full bg-transparent py-1.5 text-[12.5px] text-ink outline-none placeholder:text-ink-3"
            />
          </div>
        </Field>
        <Field label="Name">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Email" hint="optional">
          <TextInput
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Role">
          <Select
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </Select>
        </Field>

        {error && (
          <p className="flex items-center gap-1.5 text-[11px] text-error">
            <Icon name="alert" className="size-3.5" />
            {error}
          </p>
        )}
        {notice && (
          <p className="flex items-center gap-1.5 text-[11px] text-ok">
            <Icon name="check" className="size-3.5" />
            {notice}
          </p>
        )}

        <button
          onClick={submit}
          disabled={busy}
          className="rounded-[3px] bg-cta px-3 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-cta-hover disabled:opacity-40"
        >
          {busy ? "Working…" : "Add to the team"}
        </button>
      </div>

      <SudoGate
        open={sudoOpen}
        title="Confirm the change"
        detail="Granting staff access needs a fresh phone check."
        onCancel={() => setSudoOpen(false)}
        onConfirmed={() => {
          setSudoOpen(false);
          void submit();
        }}
      />
    </Card>
  );
}
