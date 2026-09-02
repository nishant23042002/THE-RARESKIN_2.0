"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import {
  Field,
  TextInput,
  Select,
  Checkbox,
  FormSection,
  Row,
} from "@/components/admin/field";
import { Icon } from "@/components/ui/icon";
import { toPaise, toRupees } from "@/lib/money";
import { COUPON_TYPES, COUPON_STATUSES } from "@/lib/validation/commerce";
import type { CouponEditDTO } from "@/server/admin";

type Mode = "create" | "edit";

interface FormState {
  code: string;
  type: (typeof COUPON_TYPES)[number];
  /** as typed: percent 0–100, or rupees for `fixed` */
  value: string;
  minRupees: string;
  maxUses: string;
  usesPerUser: string;
  startsAt: string; // datetime-local
  endsAt: string;
  stackable: boolean;
  status: (typeof COUPON_STATUSES)[number];
  note: string;
}

/** ISO → the `YYYY-MM-DDTHH:mm` a datetime-local wants, in local time. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDto(dto: CouponEditDTO): FormState {
  return {
    code: dto.code,
    type: dto.type,
    value:
      dto.type === "fixed" ? String(toRupees(dto.value)) : String(dto.value),
    minRupees: dto.minSubtotalPaise ? String(toRupees(dto.minSubtotalPaise)) : "",
    maxUses: dto.maxUses ? String(dto.maxUses) : "",
    usesPerUser: String(dto.usesPerUser),
    startsAt: toLocalInput(dto.startsAt),
    endsAt: toLocalInput(dto.endsAt),
    stackable: dto.stackable,
    status: dto.status,
    note: dto.note ?? "",
  };
}

const EMPTY: FormState = {
  code: "",
  type: "percent",
  value: "10",
  minRupees: "",
  maxUses: "",
  usesPerUser: "1",
  startsAt: "",
  endsAt: "",
  stackable: false,
  status: "active",
  note: "",
};

export function CouponForm({
  mode,
  coupon,
}: {
  mode: Mode;
  coupon?: CouponEditDTO;
}) {
  const router = useRouter();
  const [s, setS] = useState<FormState>(() =>
    coupon ? fromDto(coupon) : EMPTY,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setS((p) => ({ ...p, [k]: v }));

  const codeOk = useMemo(
    () => /^[A-Za-z0-9][A-Za-z0-9-]{1,22}[A-Za-z0-9]$/.test(s.code.trim()),
    [s.code],
  );

  function buildBody() {
    const isoOrNull = (v: string) =>
      v ? new Date(v).toISOString() : null;
    const num = (v: string, fallback = 0) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };

    const value =
      s.type === "free_shipping"
        ? 0
        : s.type === "fixed"
          ? toPaise(num(s.value))
          : num(s.value);

    return {
      type: s.type,
      value,
      minSubtotalPaise: s.minRupees ? toPaise(num(s.minRupees)) : 0,
      maxUses: s.maxUses ? Math.max(0, Math.trunc(num(s.maxUses))) : 0,
      usesPerUser: Math.max(0, Math.trunc(num(s.usesPerUser, 1))),
      startsAt: isoOrNull(s.startsAt),
      endsAt: isoOrNull(s.endsAt),
      stackable: s.stackable,
      status: s.status,
      note: s.note.trim() || null,
    };
  }

  async function save() {
    setError(null);
    if (mode === "create" && !codeOk) {
      setError("Enter a valid code — 3–24 letters, digits or dashes.");
      return;
    }
    if (s.type === "percent") {
      const p = Number(s.value);
      if (!(p > 0 && p <= 100)) {
        setError("A percent discount must be between 1 and 100.");
        return;
      }
    }
    if (s.type === "fixed" && !(Number(s.value) > 0)) {
      setError("Enter the rupee amount to take off.");
      return;
    }
    if (s.startsAt && s.endsAt && new Date(s.endsAt) <= new Date(s.startsAt)) {
      setError("The end date must be after the start date.");
      return;
    }

    setBusy(true);
    try {
      const body = buildBody();
      // `couponInput` (create) uses `.optional()` — it rejects an explicit
      // `null`. `couponUpdateInput` (edit) accepts `null` to clear a field.
      const createBody = Object.fromEntries(
        Object.entries(body).filter(([, v]) => v !== null),
      );
      const res =
        mode === "create"
          ? await fetch("/api/admin/coupons", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                code: s.code.trim().toUpperCase(),
                ...createBody,
              }),
            })
          : await fetch(
              `/api/admin/coupons/${encodeURIComponent(s.code)}`,
              {
                method: "PATCH",
                headers: { "content-type": "application/json" },
                body: JSON.stringify(body),
              },
            );
      const json = await res.json();
      if (!json.ok) {
        setError(
          json.error === "code-taken"
            ? "A coupon with that code already exists."
            : "Couldn't save the coupon. Check the fields and try again.",
        );
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <FormSection title="Code & type">
        <Row>
          <Field
            label="Code"
            hint={mode === "edit" ? "can't change" : "shown at checkout"}
            info="Shoppers type this at checkout. 3–24 letters, digits or dashes; stored upper-case. It can't be changed later — past orders reference it."
          >
            <TextInput
              value={s.code}
              onChange={(e) => set("code", e.target.value.toUpperCase())}
              disabled={mode === "edit"}
              placeholder="WELCOME10"
            />
          </Field>
          <Field
            label="Type"
            info="percent = % off the subtotal. fixed = a flat ₹ amount off. free_shipping = waives the shipping charge."
          >
            <Select
              value={s.type}
              onChange={(e) =>
                set("type", e.target.value as FormState["type"])
              }
            >
              {COUPON_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace("_", " ")}
                </option>
              ))}
            </Select>
          </Field>
        </Row>
        {s.type !== "free_shipping" && (
          <Field
            label={s.type === "percent" ? "Percent off" : "Amount off (₹)"}
            info={
              s.type === "percent"
                ? "1–100. Applied to the items subtotal."
                : "A flat rupee amount taken off the subtotal."
            }
          >
            <TextInput
              inputMode="decimal"
              value={s.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder={s.type === "percent" ? "10" : "200"}
            />
          </Field>
        )}
      </FormSection>

      <FormSection title="Limits">
        <Row>
          <Field
            label="Minimum subtotal (₹)"
            hint="optional"
            info="The bag's items subtotal must be at least this for the code to apply. Blank / 0 = no minimum."
          >
            <TextInput
              inputMode="decimal"
              value={s.minRupees}
              onChange={(e) => set("minRupees", e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field
            label="Max total uses"
            hint="0 = unlimited"
            info="How many times this code can be redeemed across all customers. 0 = unlimited."
          >
            <TextInput
              inputMode="numeric"
              value={s.maxUses}
              onChange={(e) => set("maxUses", e.target.value)}
              placeholder="0"
            />
          </Field>
        </Row>
        <Row>
          <Field
            label="Uses per customer"
            hint="0 = unlimited"
            info="Counted from each customer's non-cancelled orders that carry this code."
          >
            <TextInput
              inputMode="numeric"
              value={s.usesPerUser}
              onChange={(e) => set("usesPerUser", e.target.value)}
              placeholder="1"
            />
          </Field>
          <div className="flex items-end pb-1.5">
            <Checkbox
              label="Stackable with other codes"
              checked={s.stackable}
              onChange={(e) => set("stackable", e.target.checked)}
            />
          </div>
        </Row>
      </FormSection>

      <FormSection title="Window">
        <Row>
          <Field label="Starts" hint="optional" info="Before this, the code is rejected as 'not available yet'. Blank = active now.">
            <TextInput
              type="datetime-local"
              value={s.startsAt}
              onChange={(e) => set("startsAt", e.target.value)}
            />
          </Field>
          <Field label="Ends" hint="optional" info="After this, the code is rejected as 'expired'. Blank = never expires.">
            <TextInput
              type="datetime-local"
              value={s.endsAt}
              onChange={(e) => set("endsAt", e.target.value)}
            />
          </Field>
        </Row>
      </FormSection>

      <FormSection title="Status & note">
        <Row>
          <Field label="Status" info="active = usable. paused = temporarily off. expired = retired.">
            <Select
              value={s.status}
              onChange={(e) =>
                set("status", e.target.value as FormState["status"])
              }
            >
              {COUPON_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Internal note" hint="optional" info="Staff-only. Never shown to customers.">
            <TextInput
              value={s.note}
              onChange={(e) => set("note", e.target.value)}
              placeholder="Launch campaign"
            />
          </Field>
        </Row>
      </FormSection>

      {error && (
        <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-error">
          <Icon name="alert" className="size-3.5" />
          {error}
        </p>
      )}

      <div className="mt-4 flex gap-2 border-t border-line pt-4">
        <button
          onClick={save}
          disabled={busy}
          className="rounded-[3px] bg-cta px-4 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-black disabled:opacity-40"
        >
          {busy ? "Saving…" : mode === "create" ? "Create coupon" : "Save changes"}
        </button>
        <button
          onClick={() => router.push("/admin/coupons")}
          className="rounded-[3px] border border-line-2 px-4 py-2 text-[11px] tracking-[0.1em] text-ink-2 uppercase hover:border-ink hover:text-ink"
        >
          Cancel
        </button>
      </div>
      {mode === "edit" && coupon && coupon.usedCount > 0 && (
        <p className="mt-3 text-[11px] text-ink-3">
          Redeemed {coupon.usedCount} time{coupon.usedCount === 1 ? "" : "s"} so far.
        </p>
      )}
    </Card>
  );
}
