import Link from "next/link";
import { notFound } from "next/navigation";

import { requireAdminRole, roleRankFor } from "@/server/auth/admin";
import { getUserForAdmin } from "@/server/admin";
import { PageHeader, Card, Detail, EmptyState } from "@/components/admin/ui";
import { AccountControls } from "@/components/admin/customers/account-controls";
import { Icon } from "@/components/ui/icon";
import { ROLE_LABEL } from "@/lib/admin";
import { formatPaise } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customer · Studio" };

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAdminRole("support");
  const { id } = await params;
  const u = await getUserForAdmin(id);
  if (!u) notFound();

  const canManage = roleRankFor(ctx.user.role) >= roleRankFor("admin");
  const isSuperadmin = ctx.user.role === "superadmin";
  const isSelf = u.id === ctx.user.id;

  return (
    <>
      <Link
        href="/admin/customers"
        className="mb-3 inline-flex items-center gap-1.5 text-[11px] tracking-[0.06em] text-ink-3 uppercase hover:text-ink"
      >
        <Icon name="arrowLeft" className="size-3.5" />
        Customers
      </Link>
      <PageHeader
        eyebrow={ROLE_LABEL[u.role] ?? u.role}
        title={u.name || u.phone}
      >
        {u.status === "suspended" ? (
          <span className="text-error">
            Suspended{u.suspendedReason ? ` — ${u.suspendedReason}` : ""}
          </span>
        ) : (
          `Member since ${u.overview.memberSince ?? fmt(u.createdAt)}`
        )}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="grid gap-4">
          {/* identity */}
          <Card title="Account">
            <div className="divide-y divide-line">
              <Detail label="Phone">
                {u.phone}
                {u.phoneVerified ? "" : " (unverified)"}
              </Detail>
              <Detail label="Email">
                {u.email ? `${u.email}${u.emailVerified ? "" : " (unverified)"}` : "—"}
              </Detail>
              <Detail label="Google">
                {u.google ? `${u.google.email} · linked ${fmt(u.google.linkedAt)}` : "—"}
              </Detail>
              <Detail label="Last sign-in">
                {fmt(u.lastLoginAt)}
                {u.lastLoginIp ? ` · ${u.lastLoginIp}` : ""}
              </Detail>
            </div>
          </Card>

          {/* at a glance */}
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Orders" value={String(u.overview.orderCount)} />
            <Stat
              label="In progress"
              value={String(u.overview.inProgress)}
              muted={u.overview.inProgress === 0}
            />
            <Stat
              label={u.storeCreditPaise > 0 ? "Store credit" : "Lifetime"}
              value={
                u.storeCreditPaise > 0
                  ? formatPaise(u.storeCreditPaise)
                  : formatPaise(Math.round(u.overview.lifetimeSpend * 100))
              }
              accent={u.storeCreditPaise > 0}
            />
          </div>

          {/* recent orders */}
          <Card title="Recent orders" className="!p-0">
            {u.recentOrders.length === 0 ? (
              <EmptyState icon="receipt">No orders yet.</EmptyState>
            ) : (
              <ul className="divide-y divide-line">
                {u.recentOrders.map((o) => (
                  <li key={o.orderNumber}>
                    <Link
                      href={`/admin/orders/${encodeURIComponent(o.orderNumber)}`}
                      className="flex items-center justify-between gap-3 px-4 py-2.5 text-[12.5px] hover:bg-surface-2/60"
                    >
                      <span className="font-medium tabular-nums text-ink">
                        {o.orderNumber}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-ink-2">
                        {o.firstItemName}
                      </span>
                      <span className="text-ink-3 uppercase">{o.status}</span>
                      <span className="tabular-nums text-ink">
                        {formatPaise(Math.round(o.grandTotal * 100))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* addresses */}
          {u.addresses.length > 0 && (
            <Card title="Addresses">
              <ul className="grid gap-3 sm:grid-cols-2">
                {u.addresses.map((a) => (
                  <li
                    key={a.id}
                    className="border border-line-2 bg-surface p-2.5 text-[12px] leading-relaxed text-ink-2"
                  >
                    <span className="text-ink">
                      {a.name}
                      {a.isDefault && (
                        <span className="ml-2 text-[9.5px] tracking-[0.1em] text-ink-3 uppercase">
                          default
                        </span>
                      )}
                    </span>
                    <br />
                    {a.line1}
                    {a.line2 ? `, ${a.line2}` : ""}
                    <br />
                    {a.city}, {a.state} — {a.pincode}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* audit trail */}
          {u.auditTrail.length > 0 && (
            <Card title="Account history">
              <ul className="flex flex-col gap-1.5 text-[11.5px]">
                {u.auditTrail.map((a, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-3">
                    <span className="text-ink-2">
                      <span className="text-ink">{a.action}</span>
                      {a.note ? ` — ${a.note}` : ""}
                    </span>
                    <span className="shrink-0 text-ink-3 tabular-nums">
                      {a.actorRole} · {fmt(a.at)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>

        {/* right rail */}
        <div className="grid gap-4 lg:sticky lg:top-6 lg:self-start">
          <Card title="Signed-in devices">
            {u.sessions.length === 0 ? (
              <p className="text-[12px] text-ink-3">No active sessions.</p>
            ) : (
              <ul className="divide-y divide-line">
                {u.sessions.map((s) => (
                  <li key={s.id} className="py-2 text-[12px]">
                    <span className="text-ink">
                      {[s.device.browser, s.device.os].filter(Boolean).join(" · ") ||
                        "Unknown device"}
                    </span>
                    <span className="block text-[11px] text-ink-3">
                      {s.ip ?? "—"} · {fmt(s.lastSeenAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {canManage ? (
            <AccountControls
              userId={u.id}
              role={u.role}
              status={u.status}
              isSuperadmin={isSuperadmin}
              isSelf={isSelf}
            />
          ) : (
            <Card title="Manage">
              <p className="text-[12px] text-ink-3">
                Role, suspension and session controls need an admin.
              </p>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function Stat({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="border border-line bg-surface p-3 text-center">
      <div
        className={`text-[1.3rem] leading-none tabular-nums ${
          accent ? "text-ok" : muted ? "text-ink-3" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[9px] font-medium tracking-[0.12em] text-ink-3 uppercase">
        {label}
      </div>
    </div>
  );
}
