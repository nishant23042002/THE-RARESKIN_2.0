"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import { Icon } from "@/components/ui/icon";
import { SudoGate } from "@/components/admin/sudo-gate";
import { ROLE_LABEL } from "@/lib/admin";
import { USER_ROLES, type UserRole, type UserStatus } from "@/lib/validation/user";

const BELOW_ADMIN: UserRole[] = [
  "customer",
  "support",
  "catalog_manager",
  "operations",
];

export function AccountControls({
  userId,
  role,
  status,
  isSuperadmin,
  isSelf,
}: {
  userId: string;
  role: UserRole;
  status: UserStatus;
  isSuperadmin: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pendingBody, setPendingBody] = useState<Record<string, unknown> | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sudoOpen, setSudoOpen] = useState(false);
  const [reason, setReason] = useState("");

  const roleOptions = isSuperadmin ? [...USER_ROLES] : BELOW_ADMIN;
  const roleLocked = isSelf || (!isSuperadmin && !BELOW_ADMIN.includes(role));

  async function send(body: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setPendingBody(body);
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError(
          json.error === "requires-superadmin"
            ? "Only a superadmin can grant or change that role."
            : json.error === "self-target"
              ? "You can't change your own account here."
              : "Couldn't apply the change.",
        );
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function revokeSessions() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "revoke-sessions" }),
      });
      const json = await res.json();
      if (!json.ok) {
        setError("Couldn't sign the account out.");
        return;
      }
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card title="Manage">
      <div className="grid gap-3">
        {/* role */}
        <label className="block">
          <span className="text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
            Role
          </span>
          <select
            value={role}
            disabled={busy || roleLocked}
            onChange={(e) => send({ role: e.target.value })}
            className="mt-1 w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12.5px] text-ink disabled:opacity-50"
          >
            {[...new Set([role, ...roleOptions])].map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r] ?? r}
              </option>
            ))}
          </select>
          {roleLocked && (
            <span className="mt-1 block text-[10.5px] text-ink-3">
              {isSelf
                ? "You can't change your own role."
                : "This role needs a superadmin."}
            </span>
          )}
        </label>

        {/* status */}
        <div>
          <span className="text-[10.5px] font-medium tracking-[0.1em] text-ink-3 uppercase">
            Status
          </span>
          {status === "active" ? (
            <div className="mt-1 grid gap-1.5">
              <input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Reason (kept on the account)"
                className="w-full border border-line-2 bg-surface px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-ink placeholder:text-ink-3"
              />
              <button
                onClick={() =>
                  send({
                    status: "suspended",
                    suspendedReason: reason.trim() || undefined,
                  })
                }
                disabled={busy || isSelf}
                className="rounded-[3px] border border-error/50 px-3 py-1.5 text-[11px] tracking-[0.08em] text-error uppercase hover:bg-error hover:text-w0 disabled:opacity-40"
              >
                Suspend account
              </button>
            </div>
          ) : (
            <button
              onClick={() => send({ status: "active" })}
              disabled={busy}
              className="mt-1 rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] tracking-[0.08em] text-ink-2 uppercase hover:border-ink hover:text-ink disabled:opacity-40"
            >
              Lift suspension
            </button>
          )}
        </div>

        {/* sessions */}
        <div className="border-t border-line pt-3">
          <button
            onClick={revokeSessions}
            disabled={busy}
            className="inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-2 uppercase hover:text-ink disabled:opacity-40"
          >
            <Icon name="logout" className="size-[13px] rotate-180" />
            Sign out all sessions
          </button>
          <p className="mt-1 text-[10.5px] text-ink-3">
            For a lost phone. Reversible — they just sign in again.
          </p>
        </div>

        {error && (
          <p className="flex items-center gap-1.5 text-[11px] text-error">
            <Icon name="alert" className="size-3.5" />
            {error}
          </p>
        )}
      </div>

      <SudoGate
        open={sudoOpen}
        title="Confirm the change"
        detail="Changing a role or suspending an account needs a fresh phone check."
        onCancel={() => {
          setSudoOpen(false);
          setPendingBody(null);
        }}
        onConfirmed={() => {
          setSudoOpen(false);
          if (pendingBody) void send(pendingBody);
          setPendingBody(null);
        }}
      />
    </Card>
  );
}
