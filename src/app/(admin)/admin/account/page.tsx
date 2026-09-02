import { requireStaff } from "@/server/auth/admin";
import { getSignInMethods, listUserSessions } from "@/server/auth";
import { PageHeader, Card, Detail } from "@/components/admin/ui";
import { SignInMethods } from "@/components/account/sign-in-methods";
import { SecurityActions } from "@/components/admin/account/security-actions";
import { ROLE_LABEL } from "@/lib/admin";
import { maskPhone } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "Account & security · Studio" };

export default async function AdminAccountPage() {
  const ctx = await requireStaff();
  const [methods, sessions] = await Promise.all([
    getSignInMethods(ctx.user.id),
    listUserSessions(ctx.user.id, ctx.session._id),
  ]);

  return (
    <>
      <PageHeader eyebrow="Studio" title="Account & security">
        How you sign in, and where you&rsquo;re signed in.
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Card title="This account">
          <div className="divide-y divide-line">
            <Detail label="Name">{ctx.user.name || "—"}</Detail>
            <Detail label="Role">{ROLE_LABEL[ctx.user.role] ?? ctx.user.role}</Detail>
            <Detail label="Phone">{maskPhone(ctx.user.phone)}</Detail>
            <Detail label="Email">{ctx.user.email || "—"}</Detail>
          </div>
        </Card>

        <div className="border border-line bg-surface p-4">
          <SignInMethods methods={methods} />
        </div>
      </div>

      <Card title="Signed-in devices" className="mt-6">
        <ul className="divide-y divide-line">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2.5 text-[12.5px]"
            >
              <span className="text-ink">
                {[s.device.browser, s.device.os].filter(Boolean).join(" · ") ||
                  "Unknown device"}
                {s.current && (
                  <span className="ml-2 text-[9.5px] font-medium tracking-[0.12em] text-ink-3 uppercase">
                    This device
                  </span>
                )}
              </span>
              <span className="text-[11.5px] text-ink-3 tabular-nums">
                {s.ip ?? "—"} · last seen{" "}
                {new Date(s.lastSeenAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 border-t border-line pt-4">
          <SecurityActions />
        </div>
      </Card>
    </>
  );
}
