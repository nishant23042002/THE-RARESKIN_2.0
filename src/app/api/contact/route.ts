import { NextResponse } from "next/server";

import { contactMessageInput } from "@/lib/validation/contact";
import { dbConnect } from "@/server/db";
import { ContactMessage } from "@/server/models";
import { getAuth, requestContext } from "@/server/auth";
import { notifyContactMessage } from "@/server/notifications";

/**
 * Contact form. Persists a `ContactMessage` for staff to work in
 * `/admin/messages` and raises a `customer.message` notification. The client
 * contract is unchanged (`{ name, email, message, topic? }` in, `{ ok }` /
 * `{ error }` out).
 */
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const parsed = contactMessageInput.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Please check the form." },
      { status: 400 },
    );
  }

  const [auth, ctx] = await Promise.all([getAuth(), requestContext()]);

  try {
    await dbConnect();
    const doc = await ContactMessage.create({
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone ?? null,
      message: parsed.data.message,
      topic: parsed.data.subject ?? null,
      userId: auth?.user.id ?? null,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
    });

    await notifyContactMessage({
      id: String(doc._id),
      name: doc.name,
      email: doc.email,
      preview:
        doc.message.length > 120
          ? `${doc.message.slice(0, 120)}…`
          : doc.message,
    });
  } catch (err) {
    console.error("[contact] failed to save message", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
