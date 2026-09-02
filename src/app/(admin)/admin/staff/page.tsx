import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { listStaff } from "@/server/admin";
import { PageHeader, Card } from "@/components/admin/ui";
import { StaffInviteForm } from "@/components/admin/staff/staff-invite-form";
import { ROLE_LABEL } from "@/lib/admin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Staff · Studio" };

function fmt(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export default async function StaffPage() {
  const ctx = await requireAdminRole("admin");
  const staff = await listStaff();
  const isSuperadmin = ctx.user.role === "superadmin";

  return (
    <>
      <PageHeader eyebrow="Studio" title="Staff">
        {staff.length} member{staff.length === 1 ? "" : "s"}
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-medium">Member</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/customers/${s.id}`}
                        className="text-ink hover:underline"
                      >
                        {s.name || "—"}
                      </Link>
                      <span className="block text-[11px] text-ink-3 tabular-nums">
                        {s.phone}
                        {s.email ? ` · ${s.email}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={s.status === "suspended" ? "text-error" : "text-ink"}>
                        {ROLE_LABEL[s.role] ?? s.role}
                      </span>
                      {s.status === "suspended" && (
                        <span className="block text-[10px] tracking-[0.1em] text-error uppercase">
                          suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-3">{fmt(s.lastLoginAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="lg:sticky lg:top-6 lg:self-start">
          <StaffInviteForm isSuperadmin={isSuperadmin} />
          <p className="mt-3 text-[11px] leading-[1.6] text-ink-3">
            Adding someone creates or promotes their account by phone number.
            They sign in with a one-time code — no invite email, no password.
            Change a role or remove access from the person&rsquo;s{" "}
            <span className="text-ink-2">Customers</span> page.
          </p>
        </div>
      </div>
    </>
  );
}
