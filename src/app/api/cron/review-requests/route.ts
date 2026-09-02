import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { Order, type OrderDoc } from "@/server/models";
import { getCronSecret } from "@/server/env";
import { getSiteSettings } from "@/server/data/settings";
import { notifyReviewRequest } from "@/server/email";

/**
 * Daily — ask for a review a few days after delivery. Finds orders delivered
 * between 5 and 30 days ago and enqueues one `review-request` email each; the
 * outbox dedupes on `review-request:<orderNumber>` so re-runs are safe and no
 * "already sent" bookkeeping is needed. The 30-day floor stops a backlog from
 * being mailed all at once on first deploy.
 *
 * No-ops entirely while `flags.reviewsEnabled` is off — there's nowhere public
 * for the review to land yet.
 */
export const dynamic = "force-dynamic";

const DELAY_DAYS = 5;
const WINDOW_DAYS = 30;

function authed(request: Request): boolean {
  const secret = getCronSecret();
  return (
    Boolean(secret) &&
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

async function run() {
  await dbConnect();

  const settings = await getSiteSettings();
  if (!settings.flags.reviewsEnabled) return { skipped: "reviews-disabled" };

  const now = Date.now();
  const orders = await Order.find({
    status: "delivered",
    "fulfilment.deliveredAt": {
      $lte: new Date(now - DELAY_DAYS * 86_400_000),
      $gte: new Date(now - WINDOW_DAYS * 86_400_000),
    },
  })
    .select("orderNumber")
    .limit(200)
    .lean<Pick<OrderDoc, "orderNumber">[]>();

  let asked = 0;
  for (const o of orders) {
    try {
      await notifyReviewRequest(o.orderNumber);
      asked += 1;
    } catch (err) {
      console.error("[cron/review-requests] error for", o.orderNumber, err);
    }
  }

  return { candidates: orders.length, asked };
}

export async function GET(request: Request) {
  if (!authed(request)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, ...(await run()) });
}

export async function POST(request: Request) {
  return GET(request);
}
