import Link from "next/link";

import { Container } from "@/components/ui/container";
import { Button } from "@/components/ui/button";
import { pageMeta } from "@/lib/seo";
import { OrderRow } from "@/components/account/order-row";
import { requireUser } from "@/server/auth";
import { listUserOrders } from "@/server/data/orders";

export const metadata = pageMeta({
  title: "Your orders",
  description: "Your THE RARESKIN order history.",
  path: "/account/orders",
  noindex: true,
});

export const dynamic = "force-dynamic";

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
          <>
            <p className="mt-3 text-[12px] text-ink-3">
              {orders.length} {orders.length === 1 ? "order" : "orders"} · select
              any for its full summary, items and journey.
            </p>
            <ul className="mt-6 divide-y divide-line border-y border-line">
              {orders.map((o) => (
                <li key={o.orderNumber}>
                  <OrderRow order={o} />
                </li>
              ))}
            </ul>
          </>
        )}
      </Container>
    </main>
  );
}
