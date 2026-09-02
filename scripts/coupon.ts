import "./_bootstrap";

import { dbConnect, dbDisconnect, recordAudit } from "@/server/db";
import { Coupon } from "@/server/models";
import { couponInput } from "@/lib/validation/commerce";
import { toPaise, toRupees } from "@/lib/money";

/**
 * Scripted coupon editor. The primary editor is now `/admin/coupons` (Phase
 * G3a); this stays for bulk / CI edits and quick local pokes.
 *
 *   pnpm coupon list
 *   pnpm coupon add WELCOME10 percent 10 --min 0 --per-user 1 --max 0
 *   pnpm coupon add FLAT200 fixed 200            # rupees off
 *   pnpm coupon add FREESHIP free_shipping
 *   pnpm coupon pause <CODE>        # status → paused
 *   pnpm coupon activate <CODE>
 *
 * Flags: --min <rupees>  --per-user <n>  --max <n>  --starts <ISO>  --ends <ISO>
 */

function flag(argv: string[], name: string): string | undefined {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : undefined;
}

async function main() {
  const argv = process.argv.slice(2);
  const cmd = argv[0];
  await dbConnect();

  if (!cmd || cmd === "list") {
    const rows = await Coupon.find().sort({ createdAt: -1 }).lean();
    if (rows.length === 0) console.log("no coupons");
    for (const c of rows) {
      const val =
        c.type === "percent"
          ? `${c.value}%`
          : c.type === "fixed"
            ? `₹${toRupees(c.value)}`
            : "free shipping";
      console.log(
        `${c.code.padEnd(16)} ${c.type.padEnd(14)} ${val.padEnd(12)} ` +
          `${c.status.padEnd(8)} used ${c.usedCount}${c.maxUses ? `/${c.maxUses}` : ""}  ` +
          `min ₹${toRupees(c.minSubtotalPaise)}  per-user ${c.usesPerUser || "∞"}`,
      );
    }
    await dbDisconnect();
    return;
  }

  if (cmd === "add") {
    const [, code, type, rawValue] = argv;
    const value =
      type === "fixed"
        ? toPaise(Number(rawValue ?? 0))
        : Number(rawValue ?? 0);
    const parsed = couponInput.parse({
      code,
      type,
      value,
      minSubtotalPaise: flag(argv, "min") ? toPaise(Number(flag(argv, "min"))) : 0,
      usesPerUser: flag(argv, "per-user") ? Number(flag(argv, "per-user")) : 1,
      maxUses: flag(argv, "max") ? Number(flag(argv, "max")) : 0,
      startsAt: flag(argv, "starts"),
      endsAt: flag(argv, "ends"),
      status: "active",
    });
    const existing = await Coupon.findOne({ code: parsed.code });
    if (existing) throw new Error(`coupon ${parsed.code} already exists`);
    const doc = await Coupon.create(parsed);
    await recordAudit({
      actorId: null,
      actorRole: "system",
      action: "coupon.create",
      targetType: "Coupon",
      targetId: String(doc._id),
      after: { code: doc.code, type: doc.type, value: doc.value },
      ip: null,
      userAgent: null,
      note: "scripts/coupon.ts",
    });
    console.log(`+ ${doc.code} (${doc.type})`);
    await dbDisconnect();
    return;
  }

  if (cmd === "pause" || cmd === "activate") {
    const code = (argv[1] ?? "").toUpperCase();
    const status = cmd === "pause" ? "paused" : "active";
    const res = await Coupon.updateOne({ code }, { $set: { status } });
    console.log(
      res.matchedCount ? `✓ ${code} → ${status}` : `no coupon "${code}"`,
    );
    await dbDisconnect();
    return;
  }

  throw new Error(`unknown command "${cmd}". try: list | add | pause | activate`);
}

main().catch(async (err) => {
  console.error("\n" + (err as Error).message);
  await dbDisconnect().catch(() => {});
  process.exitCode = 1;
});
