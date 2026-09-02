import "./_bootstrap";

import mongoose, { Types } from "mongoose";

import { dbConnect, dbDisconnect } from "@/server/db";
import { Order, Product, Review, User } from "@/server/models";
import { isProduction } from "@/server/env";
import { firstNameLastInitial } from "@/lib/reviews";

/** Inlined copy of `@/server/reviews/rating` — that module is `server-only`
 *  and can't load in a tsx script. Keep the two in sync. */
async function recomputeProductRating(productId: string) {
  const rows = await Review.find({ productId, status: "approved" })
    .select("rating")
    .lean<{ rating: number }[]>();
  const count = rows.length;
  const average =
    count > 0
      ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10
      : 0;
  await Product.updateOne(
    { _id: productId },
    { $set: { "ratings.average": average, "ratings.count": count } },
  );
  return { average, count };
}

/**
 * Demo reviews so the storefront + `/admin/reviews` can be seen with content.
 * Creates a throwaway `customer` per review, a matching `delivered` order, and
 * an `approved` review, then recomputes each product's rating.
 *
 *   pnpm seed:reviews            # add the demo set
 *   pnpm seed:reviews --remove   # delete every doc this script created
 *
 * Everything it touches is marked (`user.email` ends `@rareskin.seed`, order
 * numbers start `RRS-SEED-R`) so `--remove` is exact. **Not for production.**
 */

const SEED_EMAIL_DOMAIN = "rareskin.seed";
const SEED_ORDER_PREFIX = "RRS-SEED-R";

type Seed = {
  slug: string;
  name: string;
  phone: string;
  city: string;
  state: string;
  pincode: string;
  rating: number;
  title: string;
  body: string;
  daysAgo: number;
};

const SEEDS: Seed[] = [
  {
    slug: "aurevan",
    name: "Aarav Mehta",
    phone: "+919812000101",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411001",
    rating: 5,
    title: "Turns heads without trying",
    body: "Wore this to work for a week straight and had three people ask what I had on. It opens sharp and citrusy, then about an hour in it settles into something warm and a little skin-like that lasts till I get home. Not loud, just very put-together. Already thinking about a backup bottle.",
    daysAgo: 12,
  },
  {
    slug: "aurevan",
    name: "Priya Sharma",
    phone: "+919812000102",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560001",
    rating: 4,
    title: "Beautiful, but keep it close",
    body: "The scent itself is gorgeous — soft florals over something clean and slightly powdery. My only note is that it stays quite close to the skin, so if you like a fragrance that fills a room this isn't it. For an everyday office scent it's just right, and it genuinely lasts the full day on me.",
    daysAgo: 9,
  },
  {
    slug: "orvelis",
    name: "Kabir Rana",
    phone: "+919812000103",
    city: "New Delhi",
    state: "Delhi",
    pincode: "110001",
    rating: 5,
    title: "This became my signature in a week",
    body: "I've been through a lot of bottles and nothing has clicked like this. It's warm and a bit resinous without being heavy, and it wears close in the day then opens up in the evening. My partner keeps stealing it. Bought a second one so I'm never caught without it.",
    daysAgo: 6,
  },
  {
    slug: "vayren",
    name: "Ananya Desai",
    phone: "+919812000104",
    city: "Mumbai",
    state: "Maharashtra",
    pincode: "400001",
    rating: 5,
    title: "Clean, confident, all day",
    body: "Fresh and crisp first thing in the morning, still there after the gym and a full workday. It doesn't scream and it doesn't fade — exactly what I wanted. Gym-to-dinner in one spray. The bottle feels lovely to hold too.",
    daysAgo: 3,
  },
];

function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

async function remove() {
  await dbConnect();
  const db = mongoose.connection.db;
  if (!db) throw new Error("no database connection");

  const users = await User.find({
    email: new RegExp(`@${SEED_EMAIL_DOMAIN}$`),
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();
  const userIds = users.map((u) => u._id);

  const rev = await db
    .collection("reviews")
    .deleteMany({ userId: { $in: userIds } });
  const ord = await Order.deleteMany({
    orderNumber: new RegExp(`^${SEED_ORDER_PREFIX}`),
  });
  const usr = await User.deleteMany({ _id: { $in: userIds } });
  const aud = await db.collection("auditlogs").deleteMany({
    targetType: "Review",
    actorRole: "system",
    note: "seed",
  });

  for (const slug of [...new Set(SEEDS.map((s) => s.slug))]) {
    const p = await Product.findOne({ slug }).select("_id").lean<{
      _id: unknown;
    } | null>();
    if (p) await recomputeProductRating(String(p._id));
  }

  console.log(
    `  removed — reviews ${rev.deletedCount}, orders ${ord.deletedCount}, users ${usr.deletedCount}, audit ${aud.deletedCount}`,
  );
  await dbDisconnect();
}

async function add() {
  await dbConnect();

  const affected = new Set<string>();

  for (const [i, s] of SEEDS.entries()) {
    const product = await Product.findOne({ slug: s.slug }).lean();
    if (!product) {
      console.warn(`  skip — no product "${s.slug}"`);
      continue;
    }

    const email = `${s.name.split(" ")[0].toLowerCase()}.${i}@${SEED_EMAIL_DOMAIN}`;
    const now = new Date();
    const deliveredAt = new Date(now.getTime() - s.daysAgo * 86_400_000);
    const placedAt = new Date(deliveredAt.getTime() - 4 * 86_400_000);

    const user = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          phone: s.phone,
          phoneVerifiedAt: placedAt,
          name: s.name,
          email,
          role: "customer",
          status: "active",
        },
      },
      { upsert: true, returnDocument: "after" },
    );

    const addr = {
      name: s.name.toUpperCase(),
      phone: s.phone,
      line1: "Demo address",
      city: s.city,
      state: s.state,
      stateCode: s.state === "Maharashtra" ? "27" : "07",
      pincode: s.pincode,
    };
    const price = product.pricing.price;
    const orderNumber = `${SEED_ORDER_PREFIX}${String(i + 1).padStart(3, "0")}`;

    await Order.findOneAndUpdate(
      { orderNumber },
      {
        $setOnInsert: {
          orderNumber,
          userId: user._id,
          contact: { name: s.name, phone: s.phone, email },
          items: [
            {
              productId: product._id,
              slug: s.slug,
              name: product.name,
              sku: product.inventory.sku,
              image: null,
              qty: 1,
              unitPricePaise: price,
              mrpPaise: product.pricing.mrp,
              lineTotalPaise: price,
              hsnCode: "33030090",
            },
          ],
          pricing: {
            itemsSubtotalPaise: price,
            discountPaise: 0,
            creditAppliedPaise: 0,
            shippingPaise: 0,
            codFeePaise: 0,
            taxableValuePaise: price,
            gst: {
              ratePercent: 0,
              cgstPaise: 0,
              sgstPaise: 0,
              igstPaise: 0,
              totalPaise: 0,
            },
            grandTotalPaise: price,
            currency: "INR",
          },
          coupon: null,
          shippingAddress: addr,
          billingAddress: addr,
          status: "delivered",
          payment: {
            method: "razorpay",
            status: "paid",
            provider: "razorpay",
            providerOrderId: `order_seed_${orderNumber}`,
            providerPaymentId: `pay_seed_${orderNumber}`,
            signature: "seed",
            instrument: "upi",
            capturedAt: placedAt,
            last4: null,
            upiVpa: `${s.name.split(" ")[0].toLowerCase()}@upi`,
            refundedPaise: 0,
          },
          paymentDueBy: null,
          fulfilment: {
            carrier: "Delhivery",
            trackingNumber: `SEED${i + 1}`,
            trackingUrl: null,
            shippedAt: new Date(placedAt.getTime() + 86_400_000),
            deliveredAt,
          },
          invoice: { number: null, hsn: "33030090", url: null, generatedAt: null },
          refunds: [],
          timeline: [
            { at: placedAt, status: "confirmed", actorId: null, actor: "system" },
            { at: deliveredAt, status: "delivered", actorId: null, actor: "system" },
          ],
          idempotencyKey: `seed-${orderNumber}`,
          source: "web",
          createdAt: placedAt,
        },
      },
      { upsert: true, returnDocument: "after" },
    );
    const order = await Order.findOne({ orderNumber });
    if (!order) continue;

    await Review.findOneAndUpdate(
      { userId: user._id, productId: product._id },
      {
        $setOnInsert: {
          userId: user._id,
          productId: product._id,
          productSlug: s.slug,
          orderId: order._id,
          orderNumber,
          sku: product.inventory.sku,
          rating: s.rating,
          title: s.title,
          body: s.body,
          authorName: firstNameLastInitial(s.name),
          status: "approved",
          moderation: { byId: null, at: deliveredAt, note: "seed" },
          publishedAt: deliveredAt,
          createdAt: deliveredAt,
        },
      },
      { upsert: true },
    );

    affected.add(s.slug);
    console.log(`  + ${s.slug.padEnd(14)} ${s.rating}★  ${firstNameLastInitial(s.name)} — "${s.title}"`);
  }

  for (const slug of affected) {
    const p = await Product.findOne({ slug }).select("_id").lean<{
      _id: unknown;
    } | null>();
    if (p) {
      const r = await recomputeProductRating(String(p._id));
      console.log(`    ${slug} → ${r.average}★ (${r.count})`);
    }
  }

  console.log(
    "\n✓ demo reviews seeded. Turn on flags.reviewsEnabled in /admin/settings to show them on the storefront.\n  Remove later with: pnpm seed:reviews --remove",
  );
  await dbDisconnect();
}

async function main() {
  if (isProduction()) {
    throw new Error("seed:reviews refuses to run in production");
  }
  if (flag("remove")) return remove();
  return add();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
