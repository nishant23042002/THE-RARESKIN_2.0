import { NextResponse } from "next/server";

/**
 * Newsletter sign-up — stub. Validates the address and returns success; no mail
 * is sent yet. Wire a real provider (Buttondown / Resend / Mailchimp) here when
 * the list exists; the client contract (`{ email }` in, `{ ok }` / `{ error }`
 * out) stays the same.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let email: unknown;
  try {
    ({ email } = (await request.json()) as { email?: unknown });
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  if (typeof email !== "string" || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 },
    );
  }

  // TODO: forward to the email provider once the list is live.
  return NextResponse.json({ ok: true });
}
