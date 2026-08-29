"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { GST_STATES, resolvePincode } from "@/lib/pincode";
import { normalizeIndianMobile } from "@/lib/auth";

export interface AddressView {
  id: string;
  label: string | null;
  name: string;
  phone: string;
  email: string | null;
  line1: string;
  line2: string | null;
  landmark: string | null;
  city: string;
  state: string;
  stateCode: string | null;
  pincode: string;
  isDefault: boolean;
}

/**
 * Account address book — add / edit / delete / set-default, all through
 * `/api/account/addresses`. The server keeps the "exactly one default"
 * invariant; this component just reflects it.
 */

type Draft = {
  label: string;
  name: string;
  phone: string;
  email: string;
  line1: string;
  line2: string;
  landmark: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
};

const emptyDraft: Draft = {
  label: "",
  name: "",
  phone: "",
  email: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  isDefault: false,
};

function toDraft(a: AddressView): Draft {
  return {
    label: a.label ?? "",
    name: a.name,
    phone: a.phone,
    email: a.email ?? "",
    line1: a.line1,
    line2: a.line2 ?? "",
    landmark: a.landmark ?? "",
    city: a.city,
    state: a.state,
    pincode: a.pincode,
    isDefault: a.isDefault,
  };
}

const labelCls =
  "block text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase";
const inputCls =
  "mt-1.5 w-full border-0 border-b border-line-2 bg-transparent pb-2 text-[15px] text-ink focus:border-ink focus:outline-none";

export function AddressBook({ initial }: { initial: AddressView[] }) {
  const [addresses, setAddresses] = useState(initial);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(initial.length === 0);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startAdd() {
    setDraft(emptyDraft);
    setEditingId(null);
    setAdding(true);
    setError(null);
  }
  function startEdit(a: AddressView) {
    setDraft(toDraft(a));
    setEditingId(a.id);
    setAdding(false);
    setError(null);
  }
  function cancel() {
    setAdding(false);
    setEditingId(null);
    setError(null);
  }

  function setField<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => {
      const next = { ...d, [k]: v };
      if (k === "pincode" && typeof v === "string" && /^[1-9]\d{5}$/.test(v)) {
        const region = resolvePincode(v);
        if (region && !d.state) next.state = region.state;
      }
      return next;
    });
  }

  function validate(): string | null {
    if (draft.name.trim().length < 2) return "Enter a full name.";
    if (!normalizeIndianMobile(draft.phone))
      return "Enter a valid Indian mobile number.";
    if (draft.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(draft.email.trim()))
      return "Enter a valid email address, or leave it blank.";
    if (draft.line1.trim().length < 4) return "Enter the flat / building.";
    if (draft.city.trim().length < 2) return "Enter the city.";
    if (!draft.state) return "Select a state.";
    if (!/^[1-9]\d{5}$/.test(draft.pincode)) return "Enter a 6-digit PIN code.";
    return null;
  }

  async function save() {
    const msg = validate();
    if (msg) {
      setError(msg);
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      label: draft.label.trim() || undefined,
      name: draft.name.trim(),
      phone: normalizeIndianMobile(draft.phone)!,
      email: draft.email.trim().toLowerCase() || undefined,
      line1: draft.line1.trim(),
      line2: draft.line2.trim() || undefined,
      landmark: draft.landmark.trim() || undefined,
      city: draft.city.trim(),
      state: draft.state,
      pincode: draft.pincode,
      isDefault: draft.isDefault,
    };
    try {
      const res = await fetch(
        editingId
          ? `/api/account/addresses/${editingId}`
          : "/api/account/addresses",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as {
        ok: boolean;
        address?: AddressView;
      };
      if (!data.ok || !data.address) {
        setError("Couldn’t save that address. Check the fields and try again.");
        return;
      }
      await refresh();
      cancel();
    } catch {
      setError("Network error — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    const res = await fetch("/api/account/addresses", { cache: "no-store" });
    const data = (await res.json()) as { ok: boolean; addresses?: AddressView[] };
    if (data.ok && data.addresses) setAddresses(data.addresses);
  }

  async function remove(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/account/addresses/${id}`, { method: "DELETE" });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function makeDefault(id: string) {
    setBusy(true);
    try {
      await fetch(`/api/account/addresses/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {addresses.map((a) =>
        editingId === a.id ? (
          <AddressForm
            key={a.id}
            draft={draft}
            setField={setField}
            onSave={save}
            onCancel={cancel}
            busy={busy}
            error={error}
            title="Edit address"
          />
        ) : (
          <div
            key={a.id}
            className={cn(
              "border px-5 py-4",
              a.isDefault ? "border-ink" : "border-line",
            )}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="text-[13.5px] leading-relaxed">
                <p className="text-ink">
                  {a.name}
                  {a.label ? (
                    <span className="ml-2 text-[9.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                      {a.label}
                    </span>
                  ) : null}
                  {a.isDefault ? (
                    <span className="ml-2 text-[9.5px] font-medium tracking-[0.12em] text-ok uppercase">
                      Default
                    </span>
                  ) : null}
                </p>
                <p className="mt-1 text-[12.5px] text-ink-3">
                  {a.line1}
                  {a.line2 ? `, ${a.line2}` : ""}, {a.city}, {a.state} —{" "}
                  {a.pincode}
                  <br />
                  {a.phone}
                  {a.email ? ` · ${a.email}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5 text-[10.5px] font-medium tracking-[0.12em] uppercase">
                <button
                  type="button"
                  onClick={() => startEdit(a)}
                  className="text-ink-3 hover:text-ink"
                >
                  Edit
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => makeDefault(a.id)}
                    disabled={busy}
                    className="text-ink-3 hover:text-ink"
                  >
                    Set default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(a.id)}
                  disabled={busy}
                  className="text-ink-3 hover:text-error"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ),
      )}

      {adding ? (
        <AddressForm
          draft={draft}
          setField={setField}
          onSave={save}
          onCancel={addresses.length === 0 ? undefined : cancel}
          busy={busy}
          error={error}
          title="New address"
        />
      ) : (
        <Button variant="onDark" size="sm" onClick={startAdd}>
          + Add an address
        </Button>
      )}
    </div>
  );
}

function AddressForm({
  draft,
  setField,
  onSave,
  onCancel,
  busy,
  error,
  title,
}: {
  draft: Draft;
  setField: <K extends keyof Draft>(k: K, v: Draft[K]) => void;
  onSave: () => void;
  onCancel?: () => void;
  busy: boolean;
  error: string | null;
  title: string;
}) {
  const uid = useId();
  return (
    <div className="border border-ink bg-surface px-5 py-5">
      <p className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
        {title}
      </p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Text label="PIN code" value={draft.pincode} maxLength={6} inputMode="numeric"
          onChange={(v) => setField("pincode", v.replace(/\D/g, "").slice(0, 6))} />
        <Text label="Label (Home, Work…)" value={draft.label}
          onChange={(v) => setField("label", v)} />
        <Text label="Full name" value={draft.name}
          onChange={(v) => setField("name", v)} />
        <Text label="Mobile number" value={draft.phone} inputMode="tel"
          onChange={(v) => setField("phone", v)} />
        <div className="sm:col-span-2">
          <Text label="Email (for order receipts — optional)" value={draft.email}
            inputMode="email" onChange={(v) => setField("email", v)} />
        </div>
        <div className="sm:col-span-2">
          <Text label="Flat, house no., building" value={draft.line1}
            onChange={(v) => setField("line1", v)} />
        </div>
        <div className="sm:col-span-2">
          <Text label="Area, street (optional)" value={draft.line2}
            onChange={(v) => setField("line2", v)} />
        </div>
        <Text label="Landmark (optional)" value={draft.landmark}
          onChange={(v) => setField("landmark", v)} />
        <Text label="City" value={draft.city}
          onChange={(v) => setField("city", v)} />
        <div className="sm:col-span-2">
          <label className={labelCls}>State</label>
          <select
            value={draft.state}
            onChange={(e) => setField("state", e.target.value)}
            className={inputCls}
          >
            <option value="">Select a state</option>
            {GST_STATES.map((s) => (
              <option key={s.code} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <label className="flex items-center gap-2.5 text-[12.5px] text-ink-2 sm:col-span-2">
          <input
            id={uid}
            type="checkbox"
            checked={draft.isDefault}
            onChange={(e) => setField("isDefault", e.target.checked)}
            className="accent-[var(--color-ink)]"
          />
          Make this my default address
        </label>
      </div>

      {error && <p className="mt-3 text-[12px] text-error">{error}</p>}

      <div className="mt-5 flex items-center gap-3">
        <Button size="sm" onClick={onSave} disabled={busy}>
          {busy ? "Saving…" : "Save address"}
        </Button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[10.5px] font-medium tracking-[0.14em] text-ink-3 uppercase hover:text-ink"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

function Text({
  label,
  value,
  onChange,
  maxLength,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
  inputMode?: "text" | "numeric" | "tel" | "email";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        maxLength={maxLength}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
      />
    </div>
  );
}
