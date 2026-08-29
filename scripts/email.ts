import "./_bootstrap";

/**
 * Thin client for the local email dev route (the pipeline needs the real Next
 * runtime, not a plain tsx process). Start `pnpm dev` first.
 *
 *   pnpm email:drain                 send every queued/retry-due row now
 *   pnpm email:test RRS-2026-000001  re-render every template for that order
 *                                    to .mail/*.html (dev mode, no key needed)
 */

const BASE = process.env.REVALIDATE_TARGET || "http://localhost:3000";

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd !== "drain" && cmd !== "test") {
    throw new Error("usage: pnpm email:drain | pnpm email:test <orderNumber>");
  }
  const qs = new URLSearchParams({ action: cmd });
  if (arg) qs.set("order", arg);

  const res = await fetch(`${BASE}/api/dev/email?${qs}`);
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.ok) {
    console.error("failed:", res.status, body);
    process.exitCode = 1;
    return;
  }
  console.log(body);
}

main().catch((e) => {
  console.error(
    e?.cause?.code === "ECONNREFUSED"
      ? "Could not reach the dev server — run `pnpm dev` first."
      : e,
  );
  process.exitCode = 1;
});
