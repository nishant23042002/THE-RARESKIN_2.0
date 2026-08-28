import "./_bootstrap";

import { dbConnect, dbDisconnect, Product, recordAudit } from "@/server/db";
import { getEnv } from "@/server/env";
import { toPaise, toRupees } from "@/lib/money";

/**
 * Tiny catalogue editor for before the admin dashboard exists (Phase G).
 * Every write bumps the cache so the change is live within seconds.
 *
 *   pnpm catalog list
 *   pnpm catalog set <slug> price 749          # rupees
 *   pnpm catalog set <slug> mrp 1199
 *   pnpm catalog set <slug> stock 40
 *   pnpm catalog set <slug> status draft|active|archived
 *   pnpm catalog set <slug> title "New tagline"
 *   pnpm catalog set <slug> poem "…"
 *   pnpm catalog set <slug> metaTitle "…" | metaDescription "…"
 *   pnpm catalog revalidate [tag ...]
 *
 * Revalidation target: REVALIDATE_TARGET env or --target=<url> (default
 * http://localhost:3000). Needs REVALIDATE_SECRET set.
 */

type Args = { _: string[]; target?: string };

function parseArgs(argv: string[]): Args {
  const out: Args = { _: [] };
  for (const a of argv) {
    if (a.startsWith("--target=")) out.target = a.slice("--target=".length);
    else out._.push(a);
  }
  return out;
}

const RUPEE_FIELDS = new Set(["price", "mrp"]);
const PATHS: Record<string, string> = {
  price: "pricing.price",
  mrp: "pricing.mrp",
  stock: "inventory.stock",
  status: "status",
  title: "title",
  poem: "poem",
  impression: "impression",
  metaTitle: "seo.metaTitle",
  metaDescription: "seo.metaDescription",
};

async function revalidate(tags: string[], target: string) {
  const { REVALIDATE_SECRET } = getEnv();
  if (!REVALIDATE_SECRET) {
    console.warn("  (REVALIDATE_SECRET not set — skipping cache bump)");
    return;
  }
  const url = `${target.replace(/\/+$/, "")}/api/revalidate`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${REVALIDATE_SECRET}`,
      },
      body: JSON.stringify({ tags }),
    });
    const json = await res.json();
    console.log(`  revalidate ${url} → ${res.status} ${JSON.stringify(json)}`);
  } catch (err) {
    console.warn(`  revalidate failed (${url}):`, (err as Error).message);
  }
}

async function main() {
  const { _: rest, target } = parseArgs(process.argv.slice(2));
  const cmd = rest[0];
  const revalidateTarget =
    target || process.env.REVALIDATE_TARGET || "http://localhost:3000";

  await dbConnect();

  if (!cmd || cmd === "list") {
    const docs = await Product.find()
      .sort({ order: 1 })
      .select("slug kind status pricing inventory order")
      .lean();
    for (const d of docs) {
      console.log(
        `${d.slug.padEnd(14)} ${d.kind.padEnd(9)} ${d.status.padEnd(8)} ` +
          `₹${toRupees(d.pricing.price)} (was ₹${toRupees(d.pricing.mrp)})  ` +
          `stock=${d.inventory.stock}`,
      );
    }
    await dbDisconnect();
    return;
  }

  if (cmd === "revalidate") {
    await revalidate(rest.slice(1).length ? rest.slice(1) : ["catalog"], revalidateTarget);
    await dbDisconnect();
    return;
  }

  if (cmd === "set") {
    const [, slug, field, ...valueParts] = rest;
    const value = valueParts.join(" ");
    if (!slug || !field || value === "") {
      throw new Error("usage: pnpm catalog set <slug> <field> <value>");
    }
    const path = PATHS[field];
    if (!path) {
      throw new Error(
        `unknown field "${field}". allowed: ${Object.keys(PATHS).join(", ")}`,
      );
    }

    let stored: string | number = value;
    if (RUPEE_FIELDS.has(field) || field === "stock") {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0) throw new Error(`"${value}" is not a valid number`);
      stored = RUPEE_FIELDS.has(field) ? toPaise(n) : Math.round(n);
    }
    if (field === "status" && !["draft", "active", "archived"].includes(value)) {
      throw new Error(`status must be draft | active | archived`);
    }

    const before = await Product.findOne({ slug }).lean();
    if (!before) throw new Error(`no product with slug "${slug}"`);

    const previous = path
      .split(".")
      .reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], before);

    await Product.updateOne({ slug }, { $set: { [path]: stored } });
    console.log(
      `✓ ${slug}: ${path}  ${JSON.stringify(previous)} → ${JSON.stringify(stored)}`,
    );

    await recordAudit({
      actorId: null,
      actorRole: "system",
      action: "catalog.set",
      targetType: "Product",
      targetId: String(before._id),
      before: { [path]: previous },
      after: { [path]: stored },
      ip: null,
      userAgent: null,
      note: "scripts/catalog.ts",
    });

    await revalidate(["catalog", `product:${slug}`], revalidateTarget);
    await dbDisconnect();
    return;
  }

  throw new Error(`unknown command "${cmd}". try: list | set | revalidate`);
}

main().catch(async (err) => {
  console.error("\n" + (err as Error).message);
  await dbDisconnect().catch(() => {});
  process.exitCode = 1;
});
