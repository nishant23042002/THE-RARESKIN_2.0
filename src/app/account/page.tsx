import Link from "next/link";

import { Container } from "@/components/ui/container";
import { AccountActions } from "@/components/account/account-actions";
import { OrderRow } from "@/components/account/order-row";
import { pageMeta } from "@/lib/seo";
import { maskPhone } from "@/lib/auth";
import { formatPaise } from "@/lib/money";
import { requireUser, listUserSessions } from "@/server/auth";
import { listUserOrders } from "@/server/data/orders";
import { listAddresses } from "@/server/data/addresses";
import { getAccountOverview } from "@/server/data/account";
import { getStoreCreditBalance } from "@/server/commerce";

export const metadata = pageMeta({
  title: "Your account",
  description: "Your THE RARESKIN account.",
  path: "/account",
  noindex: true,
});

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const { user, session } = await requireUser("/account");
  const [sessions, orders, addresses, creditPaise, overview] = await Promise.all(
    [
      listUserSessions(user.id, session._id),
      listUserOrders(user.id),
      listAddresses(user.id),
      getStoreCreditBalance(user.id),
      getAccountOverview(user.id),
    ],
  );
  const recent = orders.slice(0, 4);
  const defaultAddress = addresses.find((a) => a.isDefault) ?? addresses[0];

  return (
    <main
      id="main"
      className="ui-surface min-h-svh pt-[calc(var(--announce-h)+var(--header-h)+clamp(2rem,6vw,4rem))] pb-24"
    >
      <Container className="max-w-[860px]">
        <p className="eyebrow mb-3">Account</p>
        <h1 className="text-[clamp(1.9rem,4.4vw,2.7rem)] leading-[1.1] tracking-[-0.01em]">
          {user.name ? user.name : "Welcome"}
        </h1>
        <p className="mt-2.5 text-[13.5px] text-ink-2">
          {overview.memberSince ? `Member since ${overview.memberSince} · ` : ""}
          {maskPhone(user.phone)}
          {user.email ? ` · ${user.email}` : ""}
        </p>

        {/* ── at-a-glance ─────────────────────────────────────────── */}
        <div className="mt-8 grid grid-cols-3 divide-x divide-line border-y border-line">
          <Stat label="Orders" value={String(overview.orderCount)} />
          <Stat
            label="In progress"
            value={String(overview.inProgress)}
            muted={overview.inProgress === 0}
          />
          <Stat
            label={creditPaise > 0 ? "Store credit" : "Lifetime"}
            value={
              creditPaise > 0
                ? formatPaise(creditPaise)
                : formatPaise(Math.round(overview.lifetimeSpend * 100))
            }
            accent={creditPaise > 0}
          />
        </div>

        {/* ── recent orders ──────────────────────────────────────── */}
        <section className="mt-10">
          <div className="flex items-baseline justify-between">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Recent orders
            </h2>
            {orders.length > recent.length && (
              <Link
                href="/account/orders"
                className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase hover:text-ink"
              >
                All {orders.length} →
              </Link>
            )}
          </div>

          {recent.length === 0 ? (
            <div className="mt-4 border border-line bg-surface px-5 py-8 text-center">
              <p className="serif-italic text-[1.25rem] text-ink-2">
                No orders yet.
              </p>
              <Link
                href="/#shop"
                className="nav-underline mt-3 inline-block text-[11px] font-medium tracking-[0.14em] text-ink uppercase"
              >
                Shop the three →
              </Link>
            </div>
          ) : (
            <>
              <p className="mt-1.5 text-[11.5px] text-ink-3">
                Select an order to see its items, totals and where it is.
              </p>
              <ul className="mt-3 divide-y divide-line border-y border-line">
                {recent.map((o) => (
                  <li key={o.orderNumber}>
                    <OrderRow order={o} />
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        {/* ── delivery + support ─────────────────────────────────── */}
        <div className="mt-10 grid gap-px overflow-hidden border border-line bg-line sm:grid-cols-2">
          <section className="bg-surface p-5">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
                Delivery address
              </h2>
              <Link
                href="/account/addresses"
                className="text-[10.5px] font-medium tracking-[0.12em] text-ink-3 uppercase hover:text-ink"
              >
                Manage →
              </Link>
            </div>
            {defaultAddress ? (
              <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
                <span className="text-ink">{defaultAddress.name}</span>
                <br />
                {defaultAddress.line1}
                {defaultAddress.line2 ? `, ${defaultAddress.line2}` : ""}
                <br />
                {defaultAddress.city}, {defaultAddress.state} —{" "}
                {defaultAddress.pincode}
              </p>
            ) : (
              <p className="mt-3 text-[13px] text-ink-2">
                You&rsquo;ll add one at checkout.
              </p>
            )}
          </section>

          <section className="bg-surface p-5">
            <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
              Store credit
            </h2>
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-2">
              {creditPaise > 0 ? (
                <>
                  <span className="serif text-[1.4rem] text-ink">
                    {formatPaise(creditPaise)}
                  </span>
                  <br />
                  applied automatically at checkout.
                </>
              ) : (
                "Buy the Discovery Set and its value comes back as credit toward a full-size bottle."
              )}
            </p>
          </section>
        </div>

        {/* ── devices ────────────────────────────────────────────── */}
        <section className="mt-10">
          <h2 className="text-[11px] font-medium tracking-[0.16em] text-ink-3 uppercase">
            Signed-in devices
          </h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {sessions.map((s) => (
              <li
                key={s.id}
                className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-3 text-[13px]"
              >
                <span className="text-ink">
                  {[s.device.browser, s.device.os].filter(Boolean).join(" · ") ||
                    "Unknown device"}
                  {s.current && (
                    <span className="ml-2 text-[10px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                      This device
                    </span>
                  )}
                </span>
                <span className="text-[12px] text-ink-3">
                  {s.ip ?? "—"} · last seen{" "}
                  {new Date(s.lastSeenAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-10">
          <AccountActions />
        </div>
      </Container>
    </main>
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
    <div className="px-2.5 py-4 text-center first:pl-0 last:pr-0 sm:px-6">
      <div
        className={`serif text-[1.45rem] leading-none tabular-nums sm:text-[1.6rem] ${
          accent ? "text-ok" : muted ? "text-ink-3" : "text-ink"
        }`}
      >
        {value}
      </div>
      <div className="mt-1.5 text-[9px] font-medium tracking-[0.08em] text-ink-3 uppercase sm:text-[9.5px] sm:tracking-[0.14em]">
        {label}
      </div>
    </div>
  );
}
