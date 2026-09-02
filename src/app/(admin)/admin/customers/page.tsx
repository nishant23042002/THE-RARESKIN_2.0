import Link from "next/link";

import { requireAdminRole } from "@/server/auth/admin";
import { listUsers } from "@/server/admin";
import { PageHeader, Card, EmptyState } from "@/components/admin/ui";
import { CustomersFilters } from "@/components/admin/customers/customers-filters";
import { ROLE_LABEL } from "@/lib/admin";
import {
  USER_ROLES,
  USER_STATUSES,
  type UserRole,
  type UserStatus,
} from "@/lib/validation/user";

export const dynamic = "force-dynamic";
export const metadata = { title: "Customers · Studio" };

function relDate(iso: string | null): string {
  if (!iso) return "never";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  });
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminRole("support");
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v;

  const roleRaw = one(sp.role);
  const statusRaw = one(sp.status);
  const role = (USER_ROLES as readonly string[]).includes(roleRaw ?? "")
    ? (roleRaw as UserRole)
    : "all";
  const status = (USER_STATUSES as readonly string[]).includes(statusRaw ?? "")
    ? (statusRaw as UserStatus)
    : "all";
  const q = one(sp.q)?.trim() ?? "";
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const list = await listUsers({ role, status, q, page });

  return (
    <>
      <PageHeader eyebrow="Studio" title="Customers">
        {list.total} account{list.total === 1 ? "" : "s"}
      </PageHeader>

      <CustomersFilters role={role} status={status} q={q} />

      <Card className="mt-4 !p-0">
        {list.rows.length === 0 ? (
          <EmptyState icon="users">No accounts match this view.</EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px]">
              <thead>
                <tr className="border-b border-line text-[10px] tracking-[0.1em] text-ink-3 uppercase">
                  <th className="px-4 py-2.5 font-medium">Account</th>
                  <th className="px-4 py-2.5 font-medium">Role</th>
                  <th className="px-4 py-2.5 font-medium">Orders</th>
                  <th className="px-4 py-2.5 font-medium">Joined</th>
                  <th className="px-4 py-2.5 font-medium">Last seen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.rows.map((u) => (
                  <tr key={u.id} className="hover:bg-surface-2/60">
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/admin/customers/${u.id}`}
                        className="text-ink hover:underline"
                      >
                        {u.name || "—"}
                      </Link>
                      <span className="block text-[11px] text-ink-3 tabular-nums">
                        {u.phone}
                        {u.email ? ` · ${u.email}` : ""}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={
                          u.status === "suspended"
                            ? "text-error"
                            : u.role === "customer"
                              ? "text-ink-2"
                              : "text-ink"
                        }
                      >
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                      {u.status === "suspended" && (
                        <span className="block text-[10px] tracking-[0.1em] text-error uppercase">
                          suspended
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-ink-2 tabular-nums">
                      {u.orderCount}
                    </td>
                    <td className="px-4 py-2.5 text-ink-3">
                      {relDate(u.createdAt)}
                    </td>
                    <td className="px-4 py-2.5 text-ink-3">
                      {relDate(u.lastLoginAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {list.pages > 1 && (
        <Pagination page={list.page} pages={list.pages} sp={sp} />
      )}
    </>
  );
}

function Pagination({
  page,
  pages,
  sp,
}: {
  page: number;
  pages: number;
  sp: Record<string, string | string[] | undefined>;
}) {
  const build = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(sp)) {
      if (k === "page" || v == null) continue;
      params.set(k, Array.isArray(v) ? (v[0] ?? "") : v);
    }
    params.set("page", String(p));
    return `/admin/customers?${params.toString()}`;
  };
  return (
    <div className="mt-4 flex items-center justify-between text-[11.5px] text-ink-2">
      <span className="tabular-nums">
        Page {page} of {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link
            href={build(page - 1)}
            className="rounded-[3px] border border-line-2 px-2.5 py-1 hover:border-ink hover:text-ink"
          >
            Previous
          </Link>
        )}
        {page < pages && (
          <Link
            href={build(page + 1)}
            className="rounded-[3px] border border-line-2 px-2.5 py-1 hover:border-ink hover:text-ink"
          >
            Next
          </Link>
        )}
      </div>
    </div>
  );
}
