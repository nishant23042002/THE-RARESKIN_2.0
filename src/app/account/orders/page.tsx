import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";
import { formatPaise } from "@/lib/money";
import { StatusPill } from "@/components/account/status-pill";
import { requireUser } from "@/server/auth";
import { listUserOrders } from "@/server/data/orders";

export const metadata = pageMeta({
  title: "Your orders",
  description: "Your THE RARESKIN order history.",
  path: "/account/orders",
  noindex: true,
});

export const dynamic = "force-dynamic";

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export default async function OrdersPage() {
  const { user } = await requireUser("/account/orders");
  const orders = await listUserOrders(user.id);

  return (
    <main
      id="main"
      className="ui-surface min-h-svh pt-[calc(var(--announce-h)+var(--header-h)+clamp(2rem,6vw,4rem))] pb-24"
    >
      <Container className="max-w-[820px]">
        <p className="eyebrow mb-3">
          <Link href="/account" className="hover:text-ink">
            Account
          </Link>{" "}
          / Orders
        </p>
        <h1 className="text-[clamp(1.7rem,4vw,2.4rem)] leading-[1.1] tracking-[-0.01em]">
          Your orders
        </h1>

        {orders.length === 0 ? (
          <div className="mt-10 border border-line bg-surface px-6 py-14 text-center">
            <p className="serif-italic text-[1.4rem] text-ink-2">No orders yet.</p>
            <Button href="/#shop" variant="onDark" size="sm" className="mt-6">
              Shop the three
            </Button>
          </div>
        ) : (
          <ul className="mt-8 divide-y divide-line border-y border-line">
            {orders.map((o) => (
              <li key={o.orderNumber}>
                <Link
                  href={`/account/orders/${o.orderNumber}`}
                  className="flex items-center gap-4 py-4 transition-colors hover:bg-surface"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13.5px] tracking-[0.02em] text-ink">
                      {o.firstItemName}
                      {o.itemCount > 1 ? (
                        <span className="text-ink-3"> + {o.itemCount - 1} more</span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[11.5px] text-ink-3">
                      {o.orderNumber} · {fmtDate(o.placedAt)}
                    </span>
                  </span>
                  <span className="shrink-0 text-[13px] tabular-nums text-ink">
                    {formatPaise(Math.round(o.grandTotal * 100))}
                  </span>
                  <StatusPill status={o.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Container>
    </main>
  );
}
