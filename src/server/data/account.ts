import "server-only";

import { dbConnect } from "@/server/db";
import { Order, User, type OrderDoc } from "@/server/models";
import { toRupees } from "@/lib/money";

/**
 * A one-glance summary for the `/account` landing — enough that the shopper
 * sees who they are and where their orders stand without clicking through.
 */
export interface AccountOverview {
  memberSince: string | null;
  orderCount: number;
  /** rupees, lifetime, excluding cancelled */
  lifetimeSpend: number;
  /** orders not yet delivered / cancelled / refunded */
  inProgress: number;
  lastOrder: { orderNumber: string; placedAt: string; status: OrderDoc["status"] } | null;
}

const OPEN_STATUSES: OrderDoc["status"][] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
];

export async function getAccountOverview(
  userId: string,
): Promise<AccountOverview> {
  await dbConnect();
  const [user, orders] = await Promise.all([
    User.findById(userId).select("createdAt").lean<{ createdAt: Date } | null>(),
    Order.find({ userId })
      .select("orderNumber status createdAt pricing.grandTotalPaise")
      .sort({ createdAt: -1 })
      .lean<
        Pick<OrderDoc, "orderNumber" | "status" | "createdAt" | "pricing">[]
      >(),
  ]);

  const lifetimePaise = orders
    .filter((o) => o.status !== "cancelled" && o.status !== "refunded")
    .reduce((s, o) => s + o.pricing.grandTotalPaise, 0);

  const last = orders[0];

  return {
    memberSince: user?.createdAt
      ? user.createdAt.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        })
      : null,
    orderCount: orders.length,
    lifetimeSpend: toRupees(lifetimePaise),
    inProgress: orders.filter((o) => OPEN_STATUSES.includes(o.status)).length,
    lastOrder: last
      ? {
          orderNumber: last.orderNumber,
          placedAt: last.createdAt.toISOString(),
          status: last.status,
        }
      : null,
  };
}
