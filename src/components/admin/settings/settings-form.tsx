"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Card } from "@/components/admin/ui";
import {
  Field,
  TextInput,
  TextArea,
  Checkbox,
  FormSection,
  Row,
} from "@/components/admin/field";
import { InfoTip } from "@/components/admin/info-tip";
import { Icon } from "@/components/ui/icon";
import { SudoGate } from "@/components/admin/sudo-gate";
import { toPaise, toRupees } from "@/lib/money";
import {
  siteSettingsUpdateInput,
  type SiteSettingsInput,
} from "@/lib/validation/site-settings";

type S = SiteSettingsInput;

const FLAG_LABELS: Record<keyof S["flags"], { label: string; info: string }> = {
  storeLive: {
    label: "Store live",
    info: "Master switch. Off → every storefront URL shows a coming-soon holding page. Changing this needs a fresh phone check.",
  },
  checkoutEnabled: {
    label: "Checkout enabled",
    info: "Off → the cart shows 'opens with launch' and no orders can be placed.",
  },
  codEnabled: {
    label: "Cash on delivery",
    info: "Off → COD is hidden at checkout (online payment only).",
  },
  reviewsEnabled: {
    label: "Reviews",
    info: "Shows the reviews block on the PDP + homepage once you have verified-buyer reviews.",
  },
  discoverySetEnabled: {
    label: "Discovery Set",
    info: "Off → the Discovery Set is hidden from the storefront and can't be bought.",
  },
  maintenanceMode: {
    label: "Maintenance mode",
    info: "On → the storefront shows a 'back shortly' page for everyone. Use for a short planned outage. Needs a fresh phone check.",
  },
};

export function SettingsForm({ settings }: { settings: S }) {
  const router = useRouter();
  const [s, setS] = useState<S>(settings);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [sudoOpen, setSudoOpen] = useState(false);

  const flagsChanged =
    s.flags.storeLive !== settings.flags.storeLive ||
    s.flags.maintenanceMode !== settings.flags.maintenanceMode;

  function patch<K extends keyof S>(k: K, v: S[K]) {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  }
  function patchGroup<K extends keyof S>(k: K, v: Partial<S[K]>) {
    setS((p) => ({ ...p, [k]: { ...(p[k] as object), ...v } }));
    setSaved(false);
  }

  function buildBody() {
    return siteSettingsUpdateInput.parse({
      announcements: s.announcements.filter((a) => a.text.trim()),
      announcementRotateSeconds: s.announcementRotateSeconds,
      shipping: s.shipping,
      cod: s.cod,
      gst: s.gst,
      contact: s.contact,
      social: s.social,
      flags: s.flags,
    });
  }

  async function doSave() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildBody()),
      });
      const json = await res.json();
      if (res.status === 409 && json.error === "sudo-required") {
        setSudoOpen(true);
        return;
      }
      if (!json.ok) {
        setError("Couldn't save. Check the highlighted fields and try again.");
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError("Something went wrong saving. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function save() {
    setError(null);
    const check = siteSettingsUpdateInput.safeParse({
      contact: s.contact,
      social: s.social,
    });
    if (!check.success) {
      setError("Some contact or social values aren't valid. Check them.");
      return;
    }
    void doSave();
  }

  // ── money helpers (₹ in the form, paise in the model) ────────────────
  const rupees = (paise: number) => (paise ? String(toRupees(paise)) : "");
  const setPaise = <K extends keyof S>(
    group: K,
    key: keyof S[K],
    raw: string,
  ) => {
    const n = Number(raw);
    patchGroup(group, {
      [key]: raw.trim() && Number.isFinite(n) ? toPaise(n) : 0,
    } as Partial<S[K]>);
  };

  return (
    <>
      <Card>
        {/* ── Launch switches ─────────────────────────────────────── */}
        <FormSection
          title="Launch switches"
          description="What the storefront does. Store live / maintenance mode need a phone re-check on save."
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {(Object.keys(FLAG_LABELS) as (keyof S["flags"])[]).map((f) => (
              <div key={f} className="flex items-center gap-1.5">
                <Checkbox
                  label={FLAG_LABELS[f].label}
                  checked={s.flags[f]}
                  onChange={(e) =>
                    patchGroup("flags", { [f]: e.target.checked })
                  }
                />
                <InfoTip>{FLAG_LABELS[f].info}</InfoTip>
              </div>
            ))}
          </div>
          {flagsChanged && (
            <p className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[#8f6118]">
              <Icon name="lock" className="size-3.5" />
              Saving a change to Store live / Maintenance mode will ask for a
              phone code.
            </p>
          )}
        </FormSection>

        {/* ── Announcement bar ────────────────────────────────────── */}
        <FormSection
          title="Announcement bar"
          description="The rotating line above the header. Clear every row to fall back to the built-in messages."
        >
          <div className="grid gap-2">
            {s.announcements.map((a, i) => (
              <div
                key={i}
                className="grid gap-2 border border-line-2 bg-surface p-2.5 sm:grid-cols-[1fr_1fr_auto_auto]"
              >
                <TextInput
                  value={a.text}
                  placeholder="Free shipping across India"
                  onChange={(e) => {
                    const next = [...s.announcements];
                    next[i] = { ...a, text: e.target.value };
                    patch("announcements", next);
                  }}
                />
                <TextInput
                  value={a.href ?? ""}
                  placeholder="/shipping (optional link)"
                  onChange={(e) => {
                    const next = [...s.announcements];
                    next[i] = { ...a, href: e.target.value || undefined };
                    patch("announcements", next);
                  }}
                />
                <label className="flex items-center gap-1.5 text-[11px] text-ink-2">
                  <input
                    type="checkbox"
                    checked={a.active}
                    className="size-3.5 accent-ink"
                    onChange={(e) => {
                      const next = [...s.announcements];
                      next[i] = { ...a, active: e.target.checked };
                      patch("announcements", next);
                    }}
                  />
                  on
                </label>
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      "announcements",
                      s.announcements.filter((_, j) => j !== i),
                    )
                  }
                  className="text-[10px] tracking-[0.08em] text-ink-3 uppercase hover:text-error"
                >
                  Remove
                </button>
              </div>
            ))}
            {s.announcements.length < 8 && (
              <button
                type="button"
                onClick={() =>
                  patch("announcements", [
                    ...s.announcements,
                    { text: "", active: true },
                  ])
                }
                className="w-fit rounded-[3px] border border-line-2 px-3 py-1.5 text-[11px] tracking-[0.08em] text-ink-2 uppercase hover:border-ink hover:text-ink"
              >
                Add message
              </button>
            )}
          </div>
          <Field label="Rotate every (seconds)" hint="3–60">
            <TextInput
              inputMode="numeric"
              value={String(s.announcementRotateSeconds)}
              onChange={(e) =>
                patch(
                  "announcementRotateSeconds",
                  Math.min(60, Math.max(3, Number(e.target.value) || 6)),
                )
              }
            />
          </Field>
        </FormSection>

        {/* ── Shipping ────────────────────────────────────────────── */}
        <FormSection title="Shipping">
          <Row>
            <Field
              label="Free shipping above (₹)"
              info="Orders at or above this ship free. 0 = shipping is always free."
            >
              <TextInput
                inputMode="decimal"
                value={rupees(s.shipping.freeAbovePaise)}
                onChange={(e) =>
                  setPaise("shipping", "freeAbovePaise", e.target.value)
                }
                placeholder="0"
              />
            </Field>
            <Field
              label="Flat rate below threshold (₹)"
              info="Charged when the order is under the free-shipping threshold."
            >
              <TextInput
                inputMode="decimal"
                value={rupees(s.shipping.flatRatePaise)}
                onChange={(e) =>
                  setPaise("shipping", "flatRatePaise", e.target.value)
                }
                placeholder="0"
              />
            </Field>
          </Row>
          <Row>
            <Field label="Dispatch within (hours)">
              <TextInput
                inputMode="numeric"
                value={String(s.shipping.dispatchHours)}
                onChange={(e) =>
                  patchGroup("shipping", {
                    dispatchHours: Math.max(0, Number(e.target.value) || 0),
                  })
                }
              />
            </Field>
            <Field label="Delivery estimate (shown to shoppers)">
              <TextInput
                value={s.shipping.deliveryEstimate}
                onChange={(e) =>
                  patchGroup("shipping", { deliveryEstimate: e.target.value })
                }
                placeholder="2–7 working days"
              />
            </Field>
          </Row>
          <Row>
            <Field
              label="Serviceable PINs"
              hint="one per line · optional"
              info="If set, only these PIN codes can check out. Blank = every serviceable-looking PIN is allowed."
            >
              <TextArea
                rows={3}
                value={s.shipping.serviceablePincodes.join("\n")}
                onChange={(e) =>
                  patchGroup("shipping", {
                    serviceablePincodes: splitPins(e.target.value),
                  })
                }
              />
            </Field>
            <Field
              label="Blocked PINs"
              hint="one per line · optional"
              info="These PIN codes can't check out even if they'd otherwise be serviceable."
            >
              <TextArea
                rows={3}
                value={s.shipping.blockedPincodes.join("\n")}
                onChange={(e) =>
                  patchGroup("shipping", {
                    blockedPincodes: splitPins(e.target.value),
                  })
                }
              />
            </Field>
          </Row>
        </FormSection>

        {/* ── Cash on delivery ────────────────────────────────────── */}
        <FormSection title="Cash on delivery">
          <div className="flex items-center gap-1.5">
            <Checkbox
              label="Offer COD at checkout"
              checked={s.cod.enabled}
              onChange={(e) => patchGroup("cod", { enabled: e.target.checked })}
            />
            <InfoTip>
              Also needs the &ldquo;Cash on delivery&rdquo; launch switch on.
            </InfoTip>
          </div>
          <Row>
            <Field label="Max order value for COD (₹)">
              <TextInput
                inputMode="decimal"
                value={rupees(s.cod.maxOrderValuePaise)}
                onChange={(e) =>
                  setPaise("cod", "maxOrderValuePaise", e.target.value)
                }
              />
            </Field>
            <Field label="COD handling fee (₹)">
              <TextInput
                inputMode="decimal"
                value={rupees(s.cod.feePaise)}
                onChange={(e) => setPaise("cod", "feePaise", e.target.value)}
                placeholder="0"
              />
            </Field>
          </Row>
        </FormSection>

        {/* ── GST ─────────────────────────────────────────────────── */}
        <FormSection title="GST">
          <Row>
            <Field label="GSTIN" hint="optional">
              <TextInput
                value={s.gst.gstin ?? ""}
                onChange={(e) =>
                  patchGroup("gst", { gstin: e.target.value || undefined })
                }
                placeholder="27ABCDE1234F1Z5"
              />
            </Field>
            <Field
              label="Tax rate (%)"
              info="0 turns the whole tax engine off — no CGST/SGST/IGST split, no GST line, the price is just the price. Set 18 to bring it back."
            >
              <TextInput
                inputMode="decimal"
                value={String(s.gst.ratePercent)}
                onChange={(e) =>
                  patchGroup("gst", {
                    ratePercent: Math.min(28, Math.max(0, Number(e.target.value) || 0)),
                  })
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="HSN code">
              <TextInput
                value={s.gst.hsnCode}
                onChange={(e) => patchGroup("gst", { hsnCode: e.target.value })}
              />
            </Field>
            <Field label="Origin state code" info="Two digits, e.g. 27 = Maharashtra.">
              <TextInput
                value={s.gst.originStateCode}
                onChange={(e) =>
                  patchGroup("gst", { originStateCode: e.target.value })
                }
              />
            </Field>
          </Row>
          <Checkbox
            label="Displayed prices already include tax"
            checked={s.gst.pricesIncludeTax}
            onChange={(e) =>
              patchGroup("gst", { pricesIncludeTax: e.target.checked })
            }
          />
        </FormSection>

        {/* ── Contact ─────────────────────────────────────────────── */}
        <FormSection title="Contact">
          <Row>
            <Field label="Support email">
              <TextInput
                type="email"
                value={s.contact.email}
                onChange={(e) =>
                  patchGroup("contact", { email: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <TextInput
                value={s.contact.phone}
                onChange={(e) =>
                  patchGroup("contact", { phone: e.target.value })
                }
                placeholder="+917743931331"
              />
            </Field>
          </Row>
          <Row>
            <Field label="WhatsApp" hint="optional">
              <TextInput
                value={s.contact.whatsapp ?? ""}
                onChange={(e) =>
                  patchGroup("contact", {
                    whatsapp: e.target.value || undefined,
                  })
                }
              />
            </Field>
            <Field label="Maps URL" hint="optional">
              <TextInput
                value={s.contact.mapsUrl ?? ""}
                onChange={(e) =>
                  patchGroup("contact", {
                    mapsUrl: e.target.value || undefined,
                  })
                }
              />
            </Field>
          </Row>
          <Field label="Address line">
            <TextInput
              value={s.contact.addressLine}
              onChange={(e) =>
                patchGroup("contact", { addressLine: e.target.value })
              }
            />
          </Field>
          <Row>
            <Field label="Locality">
              <TextInput
                value={s.contact.locality}
                onChange={(e) =>
                  patchGroup("contact", { locality: e.target.value })
                }
              />
            </Field>
            <Field label="Region">
              <TextInput
                value={s.contact.region}
                onChange={(e) =>
                  patchGroup("contact", { region: e.target.value })
                }
              />
            </Field>
          </Row>
          <Row>
            <Field label="Postal code">
              <TextInput
                value={s.contact.postalCode}
                onChange={(e) =>
                  patchGroup("contact", { postalCode: e.target.value })
                }
              />
            </Field>
            <div />
          </Row>
          <Row>
            <Field label="Grievance officer name" hint="DPDP · optional">
              <TextInput
                value={s.contact.grievanceOfficerName ?? ""}
                onChange={(e) =>
                  patchGroup("contact", {
                    grievanceOfficerName: e.target.value || undefined,
                  })
                }
              />
            </Field>
            <Field label="Grievance officer email" hint="optional">
              <TextInput
                type="email"
                value={s.contact.grievanceOfficerEmail ?? ""}
                onChange={(e) =>
                  patchGroup("contact", {
                    grievanceOfficerEmail: e.target.value || undefined,
                  })
                }
              />
            </Field>
          </Row>
        </FormSection>

        {/* ── Social ──────────────────────────────────────────────── */}
        <FormSection
          title="Social links"
          description="Only the ones you fill in appear in the footer."
        >
          {(["instagram", "facebook", "youtube", "x", "linkedin"] as const).map(
            (k) => (
              <Field key={k} label={k}>
                <TextInput
                  value={s.social[k] ?? ""}
                  onChange={(e) =>
                    patchGroup("social", {
                      [k]: e.target.value || undefined,
                    })
                  }
                  placeholder={`https://…`}
                />
              </Field>
            ),
          )}
        </FormSection>

        {error && (
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-error">
            <Icon name="alert" className="size-3.5" />
            {error}
          </p>
        )}
        {saved && (
          <p className="mt-3 flex items-center gap-1.5 text-[11.5px] text-ok">
            <Icon name="check" className="size-3.5" />
            Settings saved.
          </p>
        )}

        <div className="mt-4 flex gap-2 border-t border-line pt-4">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-[3px] bg-cta px-4 py-2 text-[11px] tracking-[0.1em] text-w0 uppercase hover:bg-black disabled:opacity-40"
          >
            {busy ? "Saving…" : "Save settings"}
          </button>
        </div>
      </Card>

      <SudoGate
        open={sudoOpen}
        title="Confirm the change"
        detail="You're flipping a launch switch. Enter the code we just sent to your phone."
        onCancel={() => setSudoOpen(false)}
        onConfirmed={() => {
          setSudoOpen(false);
          void doSave();
        }}
      />
    </>
  );
}

function splitPins(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,]+/)
        .map((p) => p.trim())
        .filter((p) => /^\d{6}$/.test(p)),
    ),
  ].slice(0, 20_000);
}
