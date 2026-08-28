import { NextResponse } from "next/server";

/**
 * Contact form — stub. Validates the payload and returns success; no message is
 * delivered yet. Wire an inbox / helpdesk (email, Zoho, Freshdesk…) here when
 * it's ready; the client contract stays the same.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (name.length < 2) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }
  if (message.length < 10) {
    return NextResponse.json(
      { error: "Tell us a little more so we can help." },
      { status: 400 },
    );
  }

  // TODO: forward to the support inbox once it's connected.
  return NextResponse.json({ ok: true });
}
