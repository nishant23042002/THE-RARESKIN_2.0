import { NextResponse } from "next/server";

import { dbConnect } from "@/server/db";
import { getCronSecret } from "@/server/env";
import { drainOutbox } from "@/server/email";

/**
 * The delivery guarantee. The opportunistic `after()` drain covers the common
 * case; this sweep catches anything it missed — a killed `after()` callback, a
 * transient Resend outage, a row scheduled for retry. Every 2 minutes via
 * Vercel Cron (see `vercel.json`); Bearer-guarded by `CRON_SECRET`.
 */
export const dynamic = "force-dynamic";

function authed(request: Request): boolean {
  const secret = getCronSecret();
  return (
    Boolean(secret) &&
    request.headers.get("authorization") === `Bearer ${secret}`
  );
}

async function run() {
  await dbConnect();
  return drainOutbox({ limit: 50 });
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
